#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function fail(message) {
  console.error(`\n❌ ${message}\n`)
  process.exit(1)
}

const rl = readline.createInterface({ input, output })

try {
  const status = run('git status --short')
  const branch = run('git rev-parse --abbrev-ref HEAD')
  const commit = run('git log --oneline -1')
  const remote = run('git status -sb')

  console.log('\n🚨 PRODUCTION DEPLOYMENT GUARD')
  console.log('This command will deploy to Vercel PRODUCTION.\n')
  console.log(`Branch: ${branch}`)
  console.log(`Commit: ${commit}`)
  console.log(`Git: ${remote}\n`)

  if (status) {
    console.log(status)
    fail('Working tree is not clean. Commit, stash, or restore changes before production deploy.')
  }

  if (branch !== 'main') {
    fail(`You are on branch "${branch}". Production deploys must run from main.`)
  }

  const confirmText = await rl.question(
    'Type exactly DEPLOY PRODUCTION to continue: '
  )

  if (confirmText !== 'DEPLOY PRODUCTION') {
    fail('Production deploy cancelled. Confirmation text did not match.')
  }

  const secondConfirm = await rl.question(
    'Second confirmation: deploy this commit to PRODUCTION? Type yes: '
  )

  if (secondConfirm.toLowerCase() !== 'yes') {
    fail('Production deploy cancelled at second confirmation.')
  }

  console.log('\n✅ Double confirmation accepted.')
  console.log('Running: vercel --prod\n')

  const result = spawnSync('vercel', ['--prod'], {
    stdio: 'inherit',
    shell: false,
  })

  process.exit(result.status ?? 1)
} finally {
  rl.close()
}
