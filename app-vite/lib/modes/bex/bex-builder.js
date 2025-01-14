
const { join } = require('path')
const { createWriteStream } = require('fs-extra')
const archiver = require('archiver')

const AppBuilder = require('../../app-builder')
const appPaths = require('../../app-paths')
const { progress } = require('../../helpers/logger')
const config = require('./bex-config')
const { createManifest, copyBexAssets } = require('./utils')

const { name } = require(appPaths.resolve.app('package.json'))

class BexBuilder extends AppBuilder {
  async build () {
    const viteConfig = await config.vite(this.quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    const { err } = createManifest(this.quasarConf)
    if (err !== void 0) { process.exit(1) }

    const backgroundConfig = await config.backgroundScript(this.quasarConf)
    await this.buildWithEsbuild('Background Script', backgroundConfig)

    const contentConfig = await config.contentScript(this.quasarConf)
    await this.buildWithEsbuild('Content Script', contentConfig)

    const domConfig = await config.domScript(this.quasarConf)
    await this.buildWithEsbuild('Dom Script', domConfig)

    copyBexAssets(this.quasarConf)

    this.#bundlePackage(this.quasarConf.build.distDir)
  }

  #bundlePackage (folder) {
    const done = progress('Bundling in progress...')
    const file = join(folder, `Packaged.${ name }.zip`)

    let output = createWriteStream(file)
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })

    archive.pipe(output)
    archive.directory(folder, false)
    archive.finalize()

    done(`Bundle has been generated at: ${file}`)
  }
}

module.exports = BexBuilder
