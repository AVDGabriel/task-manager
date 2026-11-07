import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const packageJsonPath = resolve(projectRoot, 'package.json')
const packageLockPath = resolve(projectRoot, 'package-lock.json')

const FOUR_PART_VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/
const THREE_PART_VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)$/

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    ...options,
  }).trim()
}

function parseFourPartVersion(versionStr) {
  const fourMatch = versionStr.match(FOUR_PART_VERSION_REGEX)
  if (fourMatch) {
    return fourMatch.slice(1, 5).map(Number)
  }
  const threeMatch = versionStr.match(THREE_PART_VERSION_REGEX)
  if (threeMatch) {
    return [...threeMatch.slice(1, 4).map(Number), 0]
  }
  throw new Error(
    `Invalid version format "${versionStr}". Expected 4-part version "x.y.z.b" (e.g. 1.0.0.1).`,
  )
}

function computeNextVersion(currentVersion, targetArg) {
  if (!targetArg || targetArg === 'build') {
    const [x, y, z, b] = parseFourPartVersion(currentVersion)
    return `${x}.${y}.${z}.${b + 1}`
  }
  if (targetArg === 'patch') {
    const [x, y, z] = parseFourPartVersion(currentVersion)
    return `${x}.${y}.${z + 1}.0`
  }
  if (targetArg === 'minor') {
    const [x, y] = parseFourPartVersion(currentVersion)
    return `${x}.${y + 1}.0.0`
  }
  if (targetArg === 'major') {
    const [x] = parseFourPartVersion(currentVersion)
    return `${x + 1}.0.0.0`
  }
  if (FOUR_PART_VERSION_REGEX.test(targetArg)) {
    return targetArg
  }
  throw new Error(
    `Unknown release target "${targetArg}". Use "build" (default), "patch", "minor", "major", or an explicit "x.y.z.b" version.`,
  )
}

function verifyPublishRule(branchOverride) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const pkgVersion = pkg.version

  const branchName =
    branchOverride ||
    process.env.GITHUB_REF_NAME ||
    git(['rev-parse', '--abbrev-ref', 'HEAD'])

  const branchMatch = branchName.match(/^publish\/(\d+\.\d+\.\d+\.\d+)$/)
  if (!branchMatch) {
    throw new Error(
      `Branch "${branchName}" does not match required format "publish/x.y.z.b".`,
    )
  }

  const branchVersion = branchMatch[1]

  if (pkgVersion !== branchVersion) {
    throw new Error(
      `Version mismatch: branch "${branchName}" expects version "${branchVersion}", but package.json has "${pkgVersion}".`,
    )
  }

  const candidateTags = [branchVersion, `v${branchVersion}`]
  const headCommit = git(['rev-parse', 'HEAD'])
  let matchedAnnotatedTag = null

  for (const tag of candidateTags) {
    try {
      const objType = git(['cat-file', '-t', `refs/tags/${tag}`])
      if (objType !== 'tag') {
        throw new Error(
          `Tag "${tag}" exists but is a lightweight tag (${objType}), not an annotated tag. Create it with: git tag -a ${tag} -m "Release ${branchVersion}"`,
        )
      }
      const tagTargetCommit = git(['rev-list', '-n', '1', `refs/tags/${tag}`])
      if (tagTargetCommit !== headCommit) {
        throw new Error(
          `Annotated tag "${tag}" points to ${tagTargetCommit}, which does not match HEAD (${headCommit}).`,
        )
      }
      matchedAnnotatedTag = tag
      break
    } catch (err) {
      if (
        err.message &&
        (err.message.startsWith('Tag ') ||
          err.message.startsWith('Annotated tag '))
      ) {
        throw err
      }
    }
  }

  if (!matchedAnnotatedTag) {
    throw new Error(
      `No matching annotated git tag ("${branchVersion}" or "v${branchVersion}") found on HEAD (${headCommit}).`,
    )
  }

  console.log('✅ Publish rule verification passed!')
  console.log(`   Branch:        ${branchName}`)
  console.log(`   package.json:  ${pkgVersion}`)
  console.log(`   Annotated tag: ${matchedAnnotatedTag} -> ${headCommit}`)
  return { branchName, version: pkgVersion, tag: matchedAnnotatedTag }
}

function bumpAndTag(args) {
  const nonFlagArgs = args.filter((a) => !a.startsWith('--'))
  const targetArg = nonFlagArgs[0]
  const createPublishBranch = args.includes('--publish-branch')

  const status = git(['status', '--porcelain'])
  if (status) {
    throw new Error(
      'Working tree is not clean. Please commit or stash your changes before bumping the version.',
    )
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const oldVersion = pkg.version
  const newVersion = computeNextVersion(oldVersion, targetArg)

  pkg.version = newVersion
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

  const filesToStage = ['package.json']

  if (existsSync(packageLockPath)) {
    const lock = JSON.parse(readFileSync(packageLockPath, 'utf8'))
    lock.version = newVersion
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newVersion
    }
    writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8')
    filesToStage.push('package-lock.json')
  }

  git(['add', ...filesToStage])
  git(['commit', '-m', `chore(release): bump version to ${newVersion}`])
  git(['tag', '-a', newVersion, '-m', `Release ${newVersion}`])

  console.log(`\n✅ Version bumped: ${oldVersion} -> ${newVersion}`)
  console.log(`✅ Created annotated tag: ${newVersion}`)

  if (createPublishBranch) {
    const publishBranch = `publish/${newVersion}`
    git(['branch', publishBranch])
    console.log(`✅ Created publish branch: ${publishBranch}`)
  }

  console.log('\nNext steps:')
  console.log(`  1. Push main and tag:       git push origin main --follow-tags`)
  console.log(
    `  2. Push publish branch:     git checkout -B publish/${newVersion} && git push -u origin publish/${newVersion}`,
  )
}

function main() {
  const args = process.argv.slice(2)
  try {
    if (args.includes('--verify')) {
      const branchArgIndex = args.indexOf('--branch')
      const branchOverride =
        branchArgIndex !== -1 ? args[branchArgIndex + 1] : undefined
      verifyPublishRule(branchOverride)
    } else {
      bumpAndTag(args)
    }
  } catch (error) {
    console.error(`\n❌ ${error.message}\n`)
    process.exit(1)
  }
}

main()
