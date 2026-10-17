//! 代理支持 —— 让这个手搓的 HTTP 客户端认 `http_proxy` / `all_proxy`。
//!
//! 为什么非有不可：2026-10-17 实测，`api.typesafe.ai` 从本机直连回
//! **HTTP 451**（地区拦截），而同一时刻经 `127.0.0.1:7897` 回 **200**。
//! 也就是说这条实验跑不跑得通，取决于代理能不能被认 —— 而 `jev.rs` 里
//! 那套 `TcpStream` + `native-tls` 不查任何代理变量，设了也没用。
//!
//! 实现两种隧道，因为 7897 这类「混合端口」两种都收：
//!
//! - **HTTP CONNECT**（`http_proxy` / `https_proxy`）
//! - **SOCKS5**（`all_proxy`，含 RFC 1929 用户名密码）
//!
//! 优先级和 curl 一致：`<scheme>_proxy` 优先于 `all_proxy`；
//! `no_proxy` 命中就直连。
//!
//! ## 明确不做的事
//!
//! - **`https://` 开头的代理地址**（到代理本身走 TLS）—— 直接报错，
//!   不静默降级成明文，那是个安全坑。
//! - **`no_proxy` 里的 CIDR**（`10.0.0.0/8`）—— 只支持主机名、域后缀和 `*`。
//! - **`no_proxy` 条目里的 `:port`** —— 按主机名匹配，端口被忽略。
//! - **隐式跳过 loopback** —— 和 curl / Go / Python 一致，不偷偷绕过。
//!   本地 mock 要靠 `no_proxy=127.0.0.1,localhost` 绕开（见 README）。

use std::io::{Read, Write};
use std::net::{IpAddr, TcpStream, ToSocketAddrs};
use std::time::Duration;

/// 代理类型。只实现真正会在混合端口上遇到的两种。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProxyKind {
    /// HTTP 代理，用 `CONNECT` 方法建隧道。
    Http,
    /// SOCKS5（RFC 1928），可选用户名密码（RFC 1929）。
    Socks5,
}

impl ProxyKind {
    pub fn label(self) -> &'static str {
        match self {
            ProxyKind::Http => "http",
            ProxyKind::Socks5 => "socks5",
        }
    }
}

/// 一个具体的代理地址，外加怎么跟它说话。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProxyTarget {
    pub kind: ProxyKind,
    pub host: String,
    pub port: u16,
    /// 只对 SOCKS5 有意义：`socks5://` 为 true（本地把域名解析成 IP），
    /// `socks5h://` 为 false（把域名原样交给代理解）。
    pub resolve_locally: bool,
    pub credentials: Option<(String, String)>,
}

/// 代理怎么定。做成显式三态，是因为 `Option` 既像「直连」又像
/// 「看环境变量」，那种含糊会在测试里咬人 —— 测试应该钉死 `Direct`，
/// 而不是继承环境。
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum ProxySetting {
    /// 一律直连，无视所有环境变量。
    #[default]
    Direct,
    /// 读 `http_proxy` / `https_proxy` / `all_proxy` / `no_proxy`。
    FromEnv,
    /// 用这一个，不看环境变量。
    Fixed(ProxyTarget),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProxyError {
    /// 代理地址本身写得不对。
    Config(String),
    /// 连不上代理。
    Network(String),
    /// 隧道没建起来（代理拒绝 CONNECT、SOCKS5 协商失败等）。
    Connect(String),
    /// 代理不接受我们给的用户名密码。
    Auth(String),
}

impl std::fmt::Display for ProxyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProxyError::Config(m) => write!(f, "proxy 配置错误: {m}"),
            ProxyError::Network(m) => write!(f, "proxy network: {m}"),
            ProxyError::Connect(m) => write!(f, "proxy 隧道失败: {m}"),
            ProxyError::Auth(m) => write!(f, "proxy 认证失败: {m}"),
        }
    }
}

// ---------------------------------------------------------------------------
// 解析：环境变量 -> 该走哪个代理
// ---------------------------------------------------------------------------

/// 从环境变量判断「这个 URL 该走哪个代理」。`Ok(None)` = 直连。
pub fn resolve(scheme: &str, host: &str) -> Result<Option<ProxyTarget>, ProxyError> {
    resolve_with(scheme, host, |k| std::env::var(k).ok())
}

/// [`resolve`] 的可测版本 —— 查变量靠传进来的闭包，所以单元测试不用碰
/// 进程全局环境（`env::set_var` 在多线程测试里是数据竞争）。
pub fn resolve_with<F>(scheme: &str, host: &str, get: F) -> Result<Option<ProxyTarget>, ProxyError>
where
    F: Fn(&str) -> Option<String>,
{
    let get = &get;

    if let Some(list) = first_non_empty(&["no_proxy", "NO_PROXY"], get) {
        if no_proxy_matches(&list, host) {
            return Ok(None);
        }
    }

    let scheme_keys: &[&str] = match scheme {
        "https" => &["https_proxy", "HTTPS_PROXY"],
        "http" => &["http_proxy", "HTTP_PROXY"],
        _ => &[],
    };
    let raw = match first_non_empty(scheme_keys, get) {
        Some(v) => Some(v),
        None => first_non_empty(&["all_proxy", "ALL_PROXY"], get),
    };

    match raw {
        // 配错了要报错，不能静默退回直连 —— 否则症状是「我明明设了代理，
        // 为什么还是 451」，那比直接报错难查得多。
        Some(url) => ProxyTarget::parse(&url).map(Some),
        None => Ok(None),
    }
}

fn first_non_empty<F>(keys: &[&str], get: &F) -> Option<String>
where
    F: Fn(&str) -> Option<String>,
{
    keys.iter()
        .filter_map(|k| get(k))
        .map(|v| v.trim().to_string())
        .find(|v| !v.is_empty())
}

/// `no_proxy` 匹配。只按主机名：支持 `*`、精确域名、`*.` / `.` 前缀后缀匹配。
/// 条目里的 `:port` 被忽略（见模块文档）。
fn no_proxy_matches(list: &str, host: &str) -> bool {
    let host = host
        .trim()
        .trim_start_matches('[')
        .trim_end_matches(']')
        .to_ascii_lowercase();
    for raw in list.split(',') {
        let mut entry = raw.trim().to_ascii_lowercase();
        if entry.is_empty() {
            continue;
        }
        if entry == "*" {
            return true;
        }
        // 去掉端口：`a.com:80` -> `a.com`。
        if let Some(i) = entry.rfind(':') {
            if !entry[i + 1..].is_empty() && entry[i + 1..].chars().all(|c| c.is_ascii_digit()) {
                entry.truncate(i);
            }
        }
        let name = entry
            .trim_start_matches('[')
            .trim_end_matches(']')
            .trim_start_matches('*')
            .trim_start_matches('.')
            .to_string();
        if name.is_empty() {
            continue;
        }
        if host == name || host.ends_with(&format!(".{name}")) {
            return true;
        }
    }
    false
}

impl ProxyTarget {
    /// 解析 `http://[user:pass@]host:port` / `socks5://...` / `socks5h://...`。
    pub fn parse(url: &str) -> Result<Self, ProxyError> {
        let url = url.trim();
        let (scheme, rest) = url
            .split_once("://")
            .ok_or_else(|| ProxyError::Config(format!("代理地址缺少 scheme：{url}")))?;
        // 路径和 query 对代理地址没有意义，但带着也不该让解析失败。
        let rest = rest.split(['/', '?', '#']).next().unwrap_or("");

        let (kind, resolve_locally, default_port) = match scheme.to_ascii_lowercase().as_str() {
            "http" => (ProxyKind::Http, true, 80u16),
            "socks5" => (ProxyKind::Socks5, true, 1080),
            "socks5h" => (ProxyKind::Socks5, false, 1080),
            // 不静默降级：对一个等着 TLS 的端口发明文 CONNECT 是安全坑。
            "https" => {
                return Err(ProxyError::Config(format!(
                    "不支持到代理本身走 TLS（{url}）—— 这个客户端只对明文代理说话"
                )))
            }
            other => {
                return Err(ProxyError::Config(format!(
                    "不认识的代理 scheme：{other}（支持 http / socks5 / socks5h）"
                )))
            }
        };

        // rsplit：密码里带 @ 时取最后一个 @ 当分隔符。
        let (auth, host_port) = match rest.rsplit_once('@') {
            Some((a, h)) => (Some(a), h),
            None => (None, rest),
        };
        let credentials = match auth {
            Some(a) => {
                let (u, p) = a
                    .split_once(':')
                    .ok_or_else(|| ProxyError::Config(format!("代理用户名密码缺冒号：{a}")))?;
                Some((percent_decode(u), percent_decode(p)))
            }
            None => None,
        };

        let (host, port) = split_host_port(host_port, default_port)?;
        if host.is_empty() {
            return Err(ProxyError::Config(format!("代理地址里没有 host：{url}")));
        }
        Ok(Self {
            kind,
            host,
            port,
            resolve_locally,
            credentials,
        })
    }

    pub fn describe(&self) -> String {
        format!("{}://{}:{}", self.kind.label(), self.host, self.port)
    }
}

/// `host[:port]`，支持 `[::1]:1080` 这种带括号的 IPv6。
fn split_host_port(s: &str, default_port: u16) -> Result<(String, u16), ProxyError> {
    let s = s.trim();
    if let Some(rest) = s.strip_prefix('[') {
        let end = rest
            .find(']')
            .ok_or_else(|| ProxyError::Config(format!("IPv6 地址缺右方括号：{s}")))?;
        let host = rest[..end].to_string();
        let after = &rest[end + 1..];
        let port = if after.is_empty() {
            default_port
        } else {
            after
                .strip_prefix(':')
                .ok_or_else(|| ProxyError::Config(format!("] 后面有看不懂的东西：{s}")))?
                .parse()
                .map_err(|e| ProxyError::Config(format!("端口解析失败：{s}（{e}）")))?
        };
        return Ok((host, port));
    }
    match s.rsplit_once(':') {
        Some((h, p)) => Ok((
            h.to_string(),
            p.parse()
                .map_err(|e| ProxyError::Config(format!("端口解析失败：{s}（{e}）")))?,
        )),
        None => Ok((s.to_string(), default_port)),
    }
}

// ---------------------------------------------------------------------------
// 建隧道
// ---------------------------------------------------------------------------

/// 一条**已经穿过代理**、指向 `(host, port)` 的连接。
///
/// 隧道建好之后，上层看不见代理的存在 —— TLS 握手、SNI、证书校验全都不变。
/// 这就是 CONNECT 和 SOCKS5 CONNECT 的好处：它们都工作在 TCP 层。
pub fn tunnel(
    proxy: &ProxyTarget,
    host: &str,
    port: u16,
    timeout: Duration,
) -> Result<PrefixedStream<TcpStream>, ProxyError> {
    // 连代理这一跳必须直连 —— 否则就是拿代理去找代理。
    let mut sock = connect_to(&proxy.host, proxy.port, timeout)?;
    let leftover = match proxy.kind {
        ProxyKind::Http => http_connect(&mut sock, proxy, host, port)?,
        ProxyKind::Socks5 => socks5_connect(&mut sock, proxy, host, port)?,
    };
    Ok(PrefixedStream {
        prefix: leftover,
        inner: sock,
    })
}

fn connect_to(host: &str, port: u16, timeout: Duration) -> Result<TcpStream, ProxyError> {
    let addr = (host, port)
        .to_socket_addrs()
        .map_err(|e| ProxyError::Network(format!("解析代理地址 {host}:{port} 失败：{e}")))?
        .next()
        .ok_or_else(|| ProxyError::Network(format!("{host}:{port} 没有解析出任何地址")))?;
    let sock = TcpStream::connect_timeout(&addr, timeout)
        .map_err(|e| ProxyError::Network(format!("连代理 {host}:{port} 失败：{e}")))?;
    // 超时设在裸 socket 上，包装之后依然生效（PrefixedStream 只是转发）。
    let _ = sock.set_read_timeout(Some(timeout));
    let _ = sock.set_write_timeout(Some(timeout));
    Ok(sock)
}

fn http_connect(
    sock: &mut TcpStream,
    proxy: &ProxyTarget,
    host: &str,
    port: u16,
) -> Result<Vec<u8>, ProxyError> {
    let authority = format!("{host}:{port}");
    let mut req = format!(
        "CONNECT {authority} HTTP/1.1\r\nHost: {authority}\r\nProxy-Connection: Keep-Alive\r\n"
    );
    if let Some((u, p)) = &proxy.credentials {
        req.push_str(&format!(
            "Proxy-Authorization: Basic {}\r\n",
            base64(format!("{u}:{p}").as_bytes())
        ));
    }
    req.push_str("\r\n");

    sock.write_all(req.as_bytes())
        .and_then(|_| sock.flush())
        .map_err(|e| ProxyError::Network(format!("向 {} 发 CONNECT 失败：{e}", proxy.describe())))?;

    let (head, leftover) = read_head(sock)?;
    let status_line = head.lines().next().unwrap_or("").to_string();
    let status = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse::<u16>().ok())
        .ok_or_else(|| {
            ProxyError::Connect(format!(
                "{} 回了看不懂的状态行：{status_line}",
                proxy.describe()
            ))
        })?;
    if !(200..300).contains(&status) {
        return Err(ProxyError::Connect(format!(
            "{} 拒绝 CONNECT 到 {authority}（HTTP {status}）",
            proxy.describe()
        )));
    }
    Ok(leftover)
}

fn socks5_connect(
    sock: &mut TcpStream,
    proxy: &ProxyTarget,
    host: &str,
    port: u16,
) -> Result<Vec<u8>, ProxyError> {
    // 1. 方法协商（RFC 1928 §3）。有凭据才报 0x02，没凭据只报 0x00。
    let methods: &[u8] = if proxy.credentials.is_some() {
        &[0x00, 0x02]
    } else {
        &[0x00]
    };
    let mut greet = vec![0x05, methods.len() as u8];
    greet.extend_from_slice(methods);
    write(sock, &greet, "SOCKS5 问候")?;

    let mut chosen = [0u8; 2];
    read_exact(sock, &mut chosen, "SOCKS5 方法")?;
    if chosen[0] != 0x05 {
        return Err(ProxyError::Connect(format!(
            "{} 回的 SOCKS 版本不是 5：{}",
            proxy.describe(),
            chosen[0]
        )));
    }
    match chosen[1] {
        0x00 => {}
        0x02 => {
            let (u, p) = proxy
                .credentials
                .as_ref()
                .ok_or_else(|| ProxyError::Auth("代理要认证，但我们没配凭据".to_string()))?;
            if u.len() > 255 || p.len() > 255 {
                return Err(ProxyError::Auth("用户名或密码超过 255 字节".to_string()));
            }
            let mut auth = vec![0x01, u.len() as u8];
            auth.extend_from_slice(u.as_bytes());
            auth.push(p.len() as u8);
            auth.extend_from_slice(p.as_bytes());
            write(sock, &auth, "SOCKS5 用户名密码")?;
            let mut ans = [0u8; 2];
            read_exact(sock, &mut ans, "SOCKS5 认证结果")?;
            if ans[1] != 0x00 {
                return Err(ProxyError::Auth(format!(
                    "{} 拒绝了用户名密码（status={}）",
                    proxy.describe(),
                    ans[1]
                )));
            }
        }
        0xff => {
            return Err(ProxyError::Connect(format!(
                "{} 不接受我们提供的任何认证方式",
                proxy.describe()
            )))
        }
        other => {
            return Err(ProxyError::Connect(format!(
                "{} 回了未知的认证方式 {other}",
                proxy.describe()
            )))
        }
    }

    // 2. CONNECT（RFC 1928 §4）。
    let mut req = vec![0x05, 0x01, 0x00];
    let ip = if proxy.resolve_locally {
        resolve_ip(host)?
    } else {
        None
    };
    match ip {
        Some(IpAddr::V4(v4)) => {
            req.push(0x01);
            req.extend_from_slice(&v4.octets());
        }
        Some(IpAddr::V6(v6)) => {
            req.push(0x04);
            req.extend_from_slice(&v6.octets());
        }
        None => {
            if host.len() > 255 {
                return Err(ProxyError::Config(format!("主机名过长（>255）：{host}")));
            }
            req.push(0x03);
            req.push(host.len() as u8);
            req.extend_from_slice(host.as_bytes());
        }
    }
    req.extend_from_slice(&port.to_be_bytes());
    write(sock, &req, "SOCKS5 CONNECT")?;

    // 3. 回包（§6）。BND.ADDR/BND.PORT 我们不需要，但必须吃掉；
    //    读到的那些字节原样留给上层当隧道前缀。
    let mut head = [0u8; 4];
    read_exact(sock, &mut head, "SOCKS5 回包")?;
    if head[0] != 0x05 {
        return Err(ProxyError::Connect(format!(
            "{} 回包版本不是 5：{}",
            proxy.describe(),
            head[0]
        )));
    }
    if head[1] != 0x00 {
        return Err(ProxyError::Connect(format!(
            "{} 拒绝 CONNECT 到 {host}:{port}（REP={}）",
            proxy.describe(),
            head[1]
        )));
    }
    let bound = match head[3] {
        0x01 => 4 + 2,
        0x04 => 16 + 2,
        0x03 => {
            let mut len = [0u8; 1];
            read_exact(sock, &mut len, "SOCKS5 BND.ADDR 长度")?;
            len[0] as usize + 2
        }
        other => {
            return Err(ProxyError::Connect(format!(
                "{} 回了未知的地址类型 {other}",
                proxy.describe()
            )))
        }
    };
    let mut skip = vec![0u8; bound];
    read_exact(sock, &mut skip, "SOCKS5 BND")?;
    Ok(skip)
}

fn resolve_ip(host: &str) -> Result<Option<IpAddr>, ProxyError> {
    if let Ok(ip) = host.parse::<IpAddr>() {
        return Ok(Some(ip));
    }
    let found = (host, 0u16)
        .to_socket_addrs()
        .map_err(|e| {
            ProxyError::Network(format!("socks5:// 需要本地解析 {host}，但失败了：{e}"))
        })?
        .find_map(|a| match a.ip() {
            IpAddr::V4(_) => Some(a.ip()),
            _ => None,
        });
    Ok(found)
}

fn write(sock: &mut TcpStream, bytes: &[u8], what: &str) -> Result<(), ProxyError> {
    sock.write_all(bytes)
        .and_then(|_| sock.flush())
        .map_err(|e| ProxyError::Network(format!("发{what}失败：{e}")))
}

fn read_exact<R: Read>(r: &mut R, buf: &mut [u8], what: &str) -> Result<(), ProxyError> {
    r.read_exact(buf)
        .map_err(|e| ProxyError::Network(format!("读{what}失败：{e}")))
}

/// 读到 `\r\n\r\n` 为止。返回 (响应头, 头之后多读到的字节)。
///
/// 那个「多读到的字节」必须还给上层 —— 它们已经是隧道里的数据了，
/// 丢了的话 TLS 握手会莫名其妙地挂住。这也是为什么不能图省事直接读到 EOF。
fn read_head<R: Read>(r: &mut R) -> Result<(String, Vec<u8>), ProxyError> {
    const CAP: usize = 8 * 1024;
    let mut buf: Vec<u8> = Vec::new();
    let mut chunk = [0u8; 1024];
    loop {
        let n = r
            .read(&mut chunk)
            .map_err(|e| ProxyError::Network(format!("读代理响应头失败：{e}")))?;
        if n == 0 {
            return Err(ProxyError::Connect("代理没写完响应头就断开了".to_string()));
        }
        buf.extend_from_slice(&chunk[..n]);
        if let Some(i) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
            let rest = buf[i + 4..].to_vec();
            let head = String::from_utf8_lossy(&buf[..i]).into_owned();
            return Ok((head, rest));
        }
        if buf.len() > CAP {
            return Err(ProxyError::Connect(format!("代理响应头超过 {CAP} 字节")));
        }
    }
}

// ---------------------------------------------------------------------------
// 隧道流：先吐掉握手时多读到的字节，再转发给裸 socket
// ---------------------------------------------------------------------------

/// 握手时可能已经从隧道里读到几个字节。这一层保证它们不会丢。
#[derive(Debug)]
pub struct PrefixedStream<S> {
    prefix: Vec<u8>,
    inner: S,
}

impl<S> PrefixedStream<S> {
    /// 直接用一条现成的连接，没有多余前缀。直连和走代理共用同一个类型，
    /// 上层就不用做泛型体操了。
    pub fn direct(inner: S) -> Self {
        Self {
            prefix: Vec::new(),
            inner,
        }
    }
}

impl<S: Read> Read for PrefixedStream<S> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if !self.prefix.is_empty() {
            let n = self.prefix.len().min(buf.len());
            buf[..n].copy_from_slice(&self.prefix[..n]);
            self.prefix.drain(..n);
            return Ok(n);
        }
        self.inner.read(buf)
    }
}

impl<S: Write> Write for PrefixedStream<S> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.inner.write(buf)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

// ---------------------------------------------------------------------------
// 两个小工具。都不值得为它们引一个 crate。
// ---------------------------------------------------------------------------

fn base64(data: &[u8]) -> String {
    const T: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            T[(n >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            T[n as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

fn percent_decode(s: &str) -> String {
    if !s.contains('%') {
        return s.to_string();
    }
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            let hex = std::str::from_utf8(&b[i + 1..i + 3])
                .ok()
                .and_then(|h| u8::from_str_radix(h, 16).ok());
            if let Some(v) = hex {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    /// 用一张 map 当环境变量。
    fn env(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let m: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        move |k: &str| m.get(k).cloned()
    }

    #[test]
    fn nothing_set_means_direct() {
        assert_eq!(
            resolve_with("https", "api.typesafe.ai", env(&[])).unwrap(),
            None
        );
    }

    #[test]
    fn scheme_specific_proxy_wins_over_all_proxy() {
        let get = env(&[
            ("https_proxy", "http://127.0.0.1:7897"),
            ("all_proxy", "socks5://127.0.0.1:1080"),
        ]);
        let p = resolve_with("https", "api.typesafe.ai", get).unwrap().unwrap();
        assert_eq!(p.kind, ProxyKind::Http);
        assert_eq!(p.host, "127.0.0.1");
        assert_eq!(p.port, 7897);
    }

    #[test]
    fn all_proxy_is_the_fallback_and_never_crosses_schemes() {
        let get = env(&[("ALL_PROXY", "socks5://127.0.0.1:1080")]);
        let p = resolve_with("https", "api.typesafe.ai", get).unwrap().unwrap();
        assert_eq!(p.kind, ProxyKind::Socks5);

        // http_proxy 不该被拿来给 https 用。
        let get = env(&[
            ("http_proxy", "http://127.0.0.1:1"),
            ("all_proxy", "socks5://127.0.0.1:1080"),
        ]);
        assert_eq!(
            resolve_with("https", "x.com", get).unwrap().unwrap().kind,
            ProxyKind::Socks5
        );
    }

    #[test]
    fn uppercase_and_lowercase_are_both_honored() {
        for key in ["https_proxy", "HTTPS_PROXY"] {
            let get = env(&[(key, "http://127.0.0.1:7897")]);
            assert_eq!(
                resolve_with("https", "x.com", get).unwrap().unwrap().port,
                7897,
                "变量名 {key} 应该被认"
            );
        }
    }

    #[test]
    fn empty_values_are_treated_as_unset() {
        let get = env(&[
            ("https_proxy", "   "),
            ("all_proxy", "socks5://127.0.0.1:1080"),
        ]);
        assert_eq!(
            resolve_with("https", "x.com", get).unwrap().unwrap().kind,
            ProxyKind::Socks5,
            "空字符串应该被跳过，而不是解析失败"
        );
    }

    #[test]
    fn no_proxy_bypasses_the_proxy() {
        let pairs = [
            ("https_proxy", "http://127.0.0.1:7897"),
            ("no_proxy", "localhost,127.0.0.1,.internal.example"),
        ];
        for host in [
            "127.0.0.1",
            "localhost",
            "api.internal.example",
            "a.internal.example",
        ] {
            assert_eq!(
                resolve_with("https", host, env(&pairs)).unwrap(),
                None,
                "no_proxy 里点名了 {host}，应该直连"
            );
        }
        // 不在名单里就该走代理。
        assert!(resolve_with("https", "api.typesafe.ai", env(&pairs))
            .unwrap()
            .is_some());
    }

    #[test]
    fn no_proxy_star_bypasses_everything() {
        let get = env(&[("https_proxy", "http://127.0.0.1:7897"), ("no_proxy", "*")]);
        assert_eq!(resolve_with("https", "api.typesafe.ai", get).unwrap(), None);
    }

    #[test]
    fn no_proxy_entries_with_ports_match_by_name() {
        // 端口被忽略 —— 模块文档里写明了这条限制。
        let get = env(&[
            ("https_proxy", "http://127.0.0.1:7897"),
            ("NO_PROXY", "127.0.0.1:8080"),
        ]);
        assert_eq!(resolve_with("https", "127.0.0.1", get).unwrap(), None);
    }

    #[test]
    fn parses_every_supported_proxy_url() {
        let h = ProxyTarget::parse("http://127.0.0.1:7897").unwrap();
        assert_eq!(
            (h.kind, h.host.as_str(), h.port),
            (ProxyKind::Http, "127.0.0.1", 7897)
        );

        let s = ProxyTarget::parse("socks5://127.0.0.1:7897").unwrap();
        assert_eq!((s.kind, s.port), (ProxyKind::Socks5, 7897));
        assert!(s.resolve_locally, "socks5:// 在本地解析域名");

        let h = ProxyTarget::parse("socks5h://proxy.example.com").unwrap();
        assert!(!h.resolve_locally, "socks5h:// 交给代理解析域名");
        assert_eq!(h.port, 1080, "没写端口就用 SOCKS5 默认端口");

        let a = ProxyTarget::parse("http://user:p%40ss@proxy.example.com:3128").unwrap();
        assert_eq!(
            a.credentials,
            Some(("user".to_string(), "p@ss".to_string())),
            "密码里的百分号编码要解开"
        );

        let v6 = ProxyTarget::parse("socks5://[::1]:1080").unwrap();
        assert_eq!((v6.host.as_str(), v6.port), ("::1", 1080));

        let trailing = ProxyTarget::parse("http://127.0.0.1:7897/path?x=1").unwrap();
        assert_eq!(trailing.port, 7897, "路径和 query 不该让解析失败");
    }

    #[test]
    fn bad_proxy_urls_are_errors_not_silent_fallbacks_to_direct() {
        // 静默退回直连的症状是「我明明设了代理怎么还是 451」，比报错难查。
        assert!(matches!(
            ProxyTarget::parse("https://proxy:8443"),
            Err(ProxyError::Config(_))
        ));
        assert!(ProxyTarget::parse("proxy.example.com:7897").is_err());
        assert!(ProxyTarget::parse("ftp://proxy:21").is_err());
        assert!(ProxyTarget::parse("http://host:not-a-port").is_err());

        let get = env(&[("https_proxy", "https://proxy:8443")]);
        assert!(
            resolve_with("https", "api.typesafe.ai", get).is_err(),
            "配置错误应该冒到调用方，不该悄悄直连"
        );
    }

    #[test]
    fn base64_matches_the_known_vectors() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        assert_eq!(base64(b"user:pass"), "dXNlcjpwYXNz");
    }

    #[test]
    fn prefixed_stream_hands_back_the_bytes_read_too_early() {
        // 模拟「握手时顺手读走了隧道里的前两个字节」。
        let inner: &[u8] = b"cd";
        let mut s = PrefixedStream {
            prefix: b"ab".to_vec(),
            inner,
        };
        let mut out = [0u8; 4];
        let mut got = Vec::new();
        loop {
            let n = s.read(&mut out).unwrap();
            if n == 0 {
                break;
            }
            got.extend_from_slice(&out[..n]);
        }
        assert_eq!(got, b"abcd");
    }
}
