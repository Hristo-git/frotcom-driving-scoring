@echo off
:: Frotcom Daily Sync — runs the daily-sync.ts script and appends output to logs/daily-sync.log
:: Scheduled via Windows Task Scheduler at 23:50 daily.

cd /d "C:\Users\Hristo0203\Frotcom\frotcom-driver-scoring"

echo. >> logs\daily-sync.log
npx ts-node --project scripts/tsconfig.scripts.json scripts/daily-sync.ts >> logs\daily-sync.log 2>&1
