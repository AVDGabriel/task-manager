import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const npmrcPath = resolve(projectRoot, '.npmrc')

const token =
  process.env.GITHUB_PACKAGES_TOKEN || process.env.NODE_AUTH_TOKEN || ''

if (token) {
  console.log(
    '🔑 Configuring .npmrc for GitHub Packages (@avdgabriel scope)...',
  )
  const npmrcContent = [
    '@avdgabriel:registry=https://npm.pkg.github.com',
    `//npm.pkg.github.com/:_authToken=${token}`,
    '',
  ].join('\n')
  writeFileSync(npmrcPath, npmrcContent, 'utf8')
} else {
  console.warn(
    '⚠️  Neither GITHUB_PACKAGES_TOKEN nor NODE_AUTH_TOKEN is set. Relying on existing npm configuration.',
  )
}

const isWin = process.platform === 'win32'
execFileSync(isWin ? 'npm.cmd' : 'npm', ['ci'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: isWin,
})
