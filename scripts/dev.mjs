import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const localMfeBusPath = resolve(projectRoot, '../mfe-bus/src/index.ts')

async function resolvePackageSource(args) {
  if (args.includes('--local') || process.env.USE_LOCAL_PACKAGES === 'true') {
    return 'local'
  }
  if (args.includes('--git') || process.env.USE_LOCAL_PACKAGES === 'false') {
    return 'git'
  }

  if (!process.stdin.isTTY) {
    return 'git'
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    console.log('\n🔧 Select source for @avdgabriel/mfe-bus in task-manager:')
    console.log('  [1] Installed / Vendor package [default]')
    console.log(`  [2] Local sibling repo (${localMfeBusPath})`)
    const answer = (
      await rl.question('Select [1/2] (press Enter for 1): ')
    )
      .trim()
      .toLowerCase()

    if (answer === '2' || answer === 'local' || answer === 'l') {
      return 'local'
    }
    return 'git'
  } finally {
    rl.close()
  }
}

async function main() {
  const rawArgs = process.argv.slice(2)
  const source = await resolvePackageSource(rawArgs)
  const rsbuildArgs = rawArgs.filter(
    (arg) => arg !== '--local' && arg !== '--git',
  )

  const useLocal = source === 'local' && existsSync(localMfeBusPath)

  if (useLocal) {
    console.log(
      `\n📦 [task-manager] Using LOCAL mfe-bus source: ${localMfeBusPath}\n`,
    )
  } else {
    console.log(
      '\n📦 [task-manager] Using packaged/vendor mfe-bus source\n',
    )
  }

  const isWin = process.platform === 'win32'
  const child = spawn(
    isWin ? 'npx.cmd' : 'npx',
    ['rsbuild', 'dev', '--port', '3002', ...rsbuildArgs],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: isWin,
      env: {
        ...process.env,
        USE_LOCAL_PACKAGES: useLocal ? 'true' : 'false',
      },
    },
  )

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main()
