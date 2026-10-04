# Phase 5D — temporal habit miner weekly scheduling

Oban cron runs `TemporalHabitMinerWorker` Sundays 02:00 UTC on `:events`.

## Build

- Worker: `use Oban.Worker, queue: :events, max_attempts: 3`
- Eligible users: SQL `GROUP BY` / `HAVING count >= 5` on agreed|completed
- Per user: `TemporalHabitMiner.mine/1` (rescue + warn, continue)
- Cron: `{"0 2 * * 0", OpalCore.SocialFlow.TemporalHabitMinerWorker}`
- TFT tick `* * * * *` unchanged; no new queues

## Verify

- Worker suite 5/5
- Direct `perform/1` + `Oban.insert/1`
- A8 surface projection 13/13
