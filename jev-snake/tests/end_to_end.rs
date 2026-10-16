//! 端到端：不用 key、不用网，把整条路跑通。
//!
//! 这是这个项目存在的理由。elation 那边的 `tests/jev_real_api.rs` 在没有
//! `TYPESAFE_API_KEY` 时会直接 return 跳过 —— 也就是说**这条实验的核心路径
//! 在 CI 上从来没被验证过**。这里让它每次 `cargo test` 都跑一遍。

use jev_snake::game::{Direction, GameState, SnakeGame};
use jev_snake::jev::{JevClient, JevConfig, JevError};
use jev_snake::mock::{MockJev, Reply};
use jev_snake::provider::{DecisionSource, GreedySource, JevSource};
use std::time::{Duration, Instant};

fn config_for(base_url: &str) -> JevConfig {
    JevConfig {
        base_url: base_url.to_string(),
        api_key: Some("dummy-key-for-tests".to_string()),
        model: "jev-latest".to_string(),
        timeout: Duration::from_secs(5),
    }
}

/// 用某个决策源把一局跑完。返回 (得分, 是否撞死, 决策次数)。
fn play(src: &mut dyn DecisionSource, seed: u64, max_ticks: u64) -> (u32, bool, u32) {
    let mut game = SnakeGame::new(24, 12, seed);
    for _ in 0..max_ticks {
        let legal = game.legal_directions();
        if legal.is_empty() {
            return (game.score, false, src.stats().calls);
        }
        let m = src.choose(&game.snapshot(), &legal).expect("决策不该失败");
        assert!(
            legal.contains(&m.direction),
            "决策源 {} 选了非法的 {}",
            src.name(),
            m.direction.key()
        );
        game.request_direction(m.direction);
        if game.tick() {
            return (game.score, true, src.stats().calls);
        }
    }
    (game.score, false, src.stats().calls)
}

#[test]
fn the_model_path_runs_end_to_end_without_a_key_or_network() {
    let mock = MockJev::start(Reply::CycleLegal(0)).expect("mock 应该起得来");
    let mut src = JevSource::new(JevClient::new(config_for(&mock.base_url())));

    let (score, _died, calls) = play(&mut src, 42, 60);

    assert!(calls > 0, "一次决策都没发生，路径根本没跑通");
    assert_eq!(mock.request_count() as u32, calls, "每次决策都该对应一次请求");
    assert_eq!(src.stats().errors, 0, "不该有错误");
    // mock 每次回 input=128 / output=8，对得上就说明 usage 也读回来了。
    assert_eq!(src.stats().input_tokens, 128 * calls);
    assert_eq!(src.stats().output_tokens, 8 * calls);
    assert!(score < 60, "分数不该超过步数");
}

#[test]
fn what_we_send_only_advertises_moves_the_engine_would_accept() {
    let mock = MockJev::start(Reply::CycleLegal(0)).expect("mock 应该起得来");
    let client = JevClient::new(config_for(&mock.base_url()));
    let mut game = SnakeGame::new(24, 12, 7);

    // 走 30 步，每一步都问一次，然后把发出去的选项和引擎的合法方向逐个核对。
    for _ in 0..30 {
        let legal = game.legal_directions();
        if legal.is_empty() {
            break;
        }
        let state = game.snapshot();
        let decision = client
            .decide(&JevSource::encode_state(&state), &legal)
            .expect("不该失败");
        assert!(legal.contains(&decision.direction));

        // 从 mock 存下来的请求体里，把 criteria 的 key 抠出来。
        let body = mock.requests().pop().expect("mock 应该收到过请求");
        let parsed: serde_json::Value = serde_json::from_str(&body).unwrap();
        let criteria = parsed["questions"]["next_move"]["criteria"]
            .as_object()
            .expect("请求里应该有 criteria");
        let sent: Vec<String> = criteria.keys().cloned().collect();
        let expected: Vec<String> = legal.iter().map(|d| d.key().to_string()).collect();
        assert_eq!(sent.len(), expected.len(), "选项个数对不上");
        for key in expected {
            assert!(criteria.contains_key(&key), "请求里少了合法方向 {key}");
        }

        // state 字段必须能还原成同一盘棋。
        let sent_state: GameState =
            serde_json::from_str(parsed["state"].as_str().expect("state 是字符串"))
                .expect("state 必须是合法 GameState");
        assert_eq!(sent_state, state, "发出去的棋局和引擎里的不一致");

        game.request_direction(decision.direction);
        if game.tick() {
            break;
        }
    }
}

#[test]
fn a_hallucinated_direction_is_refused_not_obeyed() {
    // mock 无视请求里的选项，硬回一个我们没问的方向。
    let mock = MockJev::start(Reply::ForceKey("left")).expect("mock 应该起得来");
    let client = JevClient::new(config_for(&mock.base_url()));
    let game = SnakeGame::new(24, 12, 3);
    let legal = [Direction::Up, Direction::Right]; // left 是幻觉
    let err = client
        .decide(&JevSource::encode_state(&game.snapshot()), &legal)
        .unwrap_err();
    assert!(
        matches!(err, JevError::Invalid(_)),
        "幻觉应该被当成错误，实际是 {err}"
    );
}

#[test]
fn the_regional_block_is_reported_as_a_block_not_a_crash() {
    // 2026-10-16 实测：真实端点在当前地区回 451。
    let mock = MockJev::start(Reply::Status(
        451,
        r#"{"title":"Typesafe is not available in your region.","status":451}"#.to_string(),
    ))
    .expect("mock 应该起得来");
    let client = JevClient::new(config_for(&mock.base_url()));
    let game = SnakeGame::new(24, 12, 3);
    let err = client
        .decide(
            &JevSource::encode_state(&game.snapshot()),
            &[Direction::Up, Direction::Right],
        )
        .unwrap_err();
    assert!(
        matches!(err, JevError::Http { status: 451, .. }),
        "实际是 {err}"
    );
    assert!(err.hint().is_some(), "451 是已知故障，应该有提示");
}

#[test]
fn a_garbage_body_is_an_error_not_a_panic() {
    let mock = MockJev::start(Reply::Garbage).expect("mock 应该起得来");
    let client = JevClient::new(config_for(&mock.base_url()));
    let game = SnakeGame::new(24, 12, 3);
    let err = client
        .decide(&JevSource::encode_state(&game.snapshot()), &[Direction::Up])
        .unwrap_err();
    assert!(matches!(err, JevError::Invalid(_)), "实际是 {err}");
}

#[test]
fn missing_api_key_never_reaches_the_network() {
    // base_url 指向一个几乎不可能有人监听的端口：只要请求发出去，
    // 这里就会变成 network 错误而不是 not-configured。
    let cfg = JevConfig {
        base_url: "http://127.0.0.1:9".to_string(),
        api_key: None,
        model: "jev-latest".to_string(),
        timeout: Duration::from_millis(500),
    };
    let client = JevClient::new(cfg);
    let game = SnakeGame::new(24, 12, 3);
    let err = client
        .decide(&JevSource::encode_state(&game.snapshot()), &[Direction::Up])
        .unwrap_err();
    assert_eq!(err, JevError::NotConfigured);
}

#[test]
fn injected_latency_shows_up_in_the_wall_clock() {
    // 这条测试是整个实验的核心断言：模型的往返时间就是游戏的时钟。
    let fast = MockJev::start(Reply::CycleLegal(0)).expect("mock 应该起得来");
    let mut src = JevSource::new(JevClient::new(config_for(&fast.base_url())));
    play(&mut src, 42, 10);
    assert!(
        src.stats().percentile(0.5).unwrap_or(0.0) < 50.0,
        "本地 mock 不该慢"
    );

    let slow = MockJev::start(Reply::Slow(Duration::from_millis(200))).expect("mock 应该起得来");
    let mut cfg = config_for(&slow.base_url());
    cfg.timeout = Duration::from_secs(5);
    let client = JevClient::new(cfg);
    let game = SnakeGame::new(24, 12, 1);
    let started = Instant::now();
    let decision = client
        .decide(
            &JevSource::encode_state(&game.snapshot()),
            &game.legal_directions(),
        )
        .expect("不该失败");
    let elapsed = started.elapsed();
    assert!(
        elapsed >= Duration::from_millis(180),
        "注入的 200ms 延迟该体现在墙钟上，实际 {elapsed:?}"
    );
    assert!(
        decision.latency >= Duration::from_millis(180),
        "决策自己报的延迟也该算进去，实际 {:?}",
        decision.latency
    );
}

#[test]
fn the_algorithm_baseline_is_a_real_baseline() {
    // 尺子本身要靠谱：5 个 seed 上，洪水填充基线得比「一直向右」强。
    let mut total = 0;
    for seed in 1..=5u64 {
        let (greedy, _, _) = play(&mut GreedySource::default(), seed, 300);
        total += greedy;
    }
    assert!(total >= 5, "5 局至少得吃到 5 个食物，实际 {total}");
}
