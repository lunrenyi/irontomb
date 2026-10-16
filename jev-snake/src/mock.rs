//! 一个假装的 TypeSafe。
//!
//! 为什么需要它：这条实验最值钱的部分是**协议本身**（怎么把状态发出去、
//! 怎么把答案读回来、答错了会怎样），而验证它本来需要一把真 key 和一条能
//! 通的网。有个本地 mock，这三件事就随时能验 —— 而且 mock 比真服务更好
//! 逼问：它能回一个我们**没问过**的方向，能回 451，能回垃圾。
//!
//! mock 还会把收到的请求体存下来。真实 API 不会把请求回显给你，这里能。

use crate::game::Direction;
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// mock 每次该怎么回。
#[derive(Debug, Clone)]
pub enum Reply {
    /// 在请求给的 criteria 里按顺序循环取第 n 个 key。
    /// 真正在测「请求里的选项和返回值是否对得上」。
    CycleLegal(usize),
    /// 固定回一个 key —— 哪怕请求里根本没这个选项（幻觉测试）。
    ForceKey(&'static str),
    /// 固定回某个方向。正常情况下它应该在 criteria 里。
    Always(Direction),
    /// 回一个非 2xx。451 = TypeSafe 的地区封锁。
    Status(u16, String),
    /// 200，但 body 不是我们能解析的东西。
    Garbage,
    /// 回之前先睡这么久 —— 只决定回得多慢，不改变回什么。
    /// 界面上用它把往返时间拉长，「一格 = 一次往返」就看得见了。
    Slow(Duration),
}

pub struct MockJev {
    addr: SocketAddr,
    /// 收到的请求体，按顺序。测试靠它检查「我们到底发了什么」。
    requests: Arc<Mutex<Vec<String>>>,
    stop: Arc<AtomicBool>,
}

impl MockJev {
    /// 在 127.0.0.1 的随机端口上起一个 mock。
    pub fn start(reply: Reply) -> std::io::Result<Self> {
        let listener = TcpListener::bind("127.0.0.1:0")?;
        let addr = listener.local_addr()?;
        let requests = Arc::new(Mutex::new(Vec::new()));
        let stop = Arc::new(AtomicBool::new(false));

        let thread_requests = Arc::clone(&requests);
        let thread_stop = Arc::clone(&stop);
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                if thread_stop.load(Ordering::SeqCst) {
                    return;
                }
                match stream {
                    // 单个连接失败不该拖垮整个 mock。
                    Ok(s) => {
                        let _ = handle(s, &reply, &thread_requests);
                    }
                    Err(_) => return,
                }
            }
        });

        Ok(Self {
            addr,
            requests,
            stop,
        })
    }

    /// 拼成客户端能直接吃的 base_url。
    pub fn base_url(&self) -> String {
        format!("http://{}", self.addr)
    }

    pub fn requests(&self) -> Vec<String> {
        self.requests.lock().unwrap().clone()
    }

    pub fn request_count(&self) -> usize {
        self.requests.lock().unwrap().len()
    }
}

impl Drop for MockJev {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        // 自己敲一下门，把阻塞在 accept 上的线程叫醒。
        let _ = TcpStream::connect(self.addr);
    }
}

/// 读一个完整的 HTTP 请求，返回 (head, body)。
fn read_request(stream: &mut TcpStream) -> std::io::Result<(String, String)> {
    let mut buf = Vec::new();
    let mut chunk = [0u8; 1024];
    let head_end;
    loop {
        let n = stream.read(&mut chunk)?;
        if n == 0 {
            return Ok((String::new(), String::new()));
        }
        buf.extend_from_slice(&chunk[..n]);
        if let Some(pos) = find(&buf, b"\r\n\r\n") {
            head_end = pos + 4;
            break;
        }
    }
    let head = String::from_utf8_lossy(&buf[..head_end]).to_string();

    // Content-Length 决定 body 有多长；不读完就解析只会得到半截 JSON。
    let len: usize = head
        .lines()
        .find(|l| l.to_ascii_lowercase().starts_with("content-length:"))
        .and_then(|l| l.split(':').nth(1))
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(0);
    let mut body = buf[head_end..].to_vec();
    while body.len() < len {
        let n = stream.read(&mut chunk)?;
        if n == 0 {
            break;
        }
        body.extend_from_slice(&chunk[..n]);
    }
    Ok((head, String::from_utf8_lossy(&body).to_string()))
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn handle(
    mut stream: TcpStream,
    reply: &Reply,
    requests: &Arc<Mutex<Vec<String>>>,
) -> std::io::Result<()> {
    let (_head, body) = read_request(&mut stream)?;
    requests.lock().unwrap().push(body.clone());

    if let Reply::Slow(d) = reply {
        std::thread::sleep(*d);
    }

    match reply {
        Reply::Status(code, msg) => write_raw(&mut stream, *code, "application/json", msg),
        Reply::Garbage => write_raw(&mut stream, 200, "text/plain", "not json at all"),
        _ => {
            let payload = build_answer(&body, reply).to_string();
            write_raw(&mut stream, 200, "application/json", &payload)
        }
    }
}

/// 按请求里的 criteria 生成一个像模像样的响应。
fn build_answer(request_body: &str, reply: &Reply) -> Value {
    let request: Value = serde_json::from_str(request_body).unwrap_or(Value::Null);
    let criteria = request
        .get("questions")
        .and_then(|q| q.get("next_move"))
        .and_then(|q| q.get("criteria"))
        .and_then(|c| c.as_object())
        .cloned()
        .unwrap_or_default();

    // 排序后再取，mock 的行为才是可复现的（HashMap 顺序不保证）。
    let mut keys: Vec<String> = criteria.keys().cloned().collect();
    keys.sort();

    let chosen = match reply {
        Reply::ForceKey(k) => k.to_string(),
        Reply::Always(d) => d.key().to_string(),
        Reply::CycleLegal(n) => {
            if keys.is_empty() {
                "right".to_string()
            } else {
                keys[*n % keys.len()].clone()
            }
        }
        _ => keys.first().cloned().unwrap_or_else(|| "right".to_string()),
    };

    // 造一份看着像的概率分布：选中的 0.7，剩下的平分。
    let mut probabilities = serde_json::Map::new();
    let others = keys.len().saturating_sub(1).max(1) as f32;
    for k in &keys {
        let p = if *k == chosen { 0.7 } else { 0.3 / others };
        probabilities.insert(k.clone(), json!(p));
    }

    json!({
        "model": request.get("model").and_then(|m| m.as_str()).unwrap_or("jev-mock"),
        "answers": {
            "next_move": {
                "type": "choice",
                "choice": chosen,
                "confidence": 0.7,
                "probabilities": Value::Object(probabilities),
            }
        },
        "usage": { "input_tokens": 128, "output_tokens": 8 }
    })
}

fn write_raw(
    stream: &mut TcpStream,
    status: u16,
    content_type: &str,
    payload: &str,
) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        429 => "Too Many Requests",
        451 => "Unavailable For Legal Reasons",
        _ => "Error",
    };
    let head = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\n\
         Content-Length: {}\r\nConnection: close\r\n\r\n",
        payload.len()
    );
    stream.write_all(head.as_bytes())?;
    stream.write_all(payload.as_bytes())?;
    stream.flush()
}
