// このプロジェクト専用の Cloudflare ログインで wrangler を動かす。
// PC 全体の wrangler ログイン（別アカウント）には影響しない。
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.wrangler-home')
const child = spawn('npx', ['wrangler', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, XDG_CONFIG_HOME: home },
})
child.on('exit', (code) => process.exit(code ?? 1))
