import ArtsyArtifact from "../artifacts/contracts/Artsy.sol/Artsy.json"
import { Artsy } from "../typechain/Artsy"

import GalleryArtifact from "../artifacts/contracts/Gallery.sol/Gallery.json"
import { Gallery } from "../typechain/Gallery"

import { expect } from 'chai'
import { ethers } from 'hardhat'
import { waffle } from 'hardhat'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Wallet } from "@ethersproject/wallet"
import { Canvas } from "./models/canvas"
import { BigNumber } from "ethers"
import { BLACK_COLOR, WHITE_COLOR } from "./core/consts"

const { deployContract, provider } = waffle

describe("Artsy and Gallery", () => {
  let artsy: Artsy
  let gallery: Gallery

  let signer: Wallet
  let wallets: Wallet[]
  let accounts: SignerWithAddress[]

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    wallets = provider.getWallets()
    signer = wallets[0]

    gallery = (await deployContract(signer, GalleryArtifact)) as Gallery
    const artsyAddress = await gallery.artsy()
    artsy = new ethers.Contract(artsyAddress, ArtsyArtifact.abi, signer) as Artsy
  })

  it("sanity check", async () => {
    const artsyAddress = await gallery.artsy()

    expect(artsy.address).to.equals(artsyAddress)
  })

  describe("should not", () => {
    it("allow to claim NFT ownership when doesn't have all the shares", async () => {
      const canvasName = 'dummy canvas'
      const canvas = await createCanvas(canvasName, 3, 3, 2)

      await gallery.paint(canvas.name, [0, 0], [0, 0], [randomColor(), randomColor()])
      await gallery.paint(canvas.name, [0, 0], [1, 1], [randomColor(), randomColor()])
      await gallery.paint(canvas.name, [0, 0], [2, 2], [randomColor(), randomColor()])

      await gallery.paint(canvas.name, [1, 1], [0, 0], [randomColor(), randomColor()])
      await gallery.paint(canvas.name, [1, 1], [1, 1], [randomColor(), randomColor()])
      await gallery.paint(canvas.name, [1, 1], [2, 2], [randomColor(), randomColor()])

      await gallery.paint(canvas.name, [2, 2], [0, 0], [randomColor(), randomColor()])
      await gallery.paint(canvas.name, [2, 2], [1, 1], [randomColor(), randomColor()])
      await gallery.connect(accounts[1]).paint(canvas.name, [2, 2], [2, 2], [randomColor(), randomColor()])

      await expect(artsy.claimOwnership(canvasName))
        .to.be
        .revertedWith('Trying to claim ownership without having all the shares')
    })

    it("transfer more shares than you have", async () => {
      const canvasName = 'dummy canvas'
      const canvas = await createCanvas(canvasName, 2, 2, 1)

      await gallery.paint(canvas.name, [0], [0], [randomColor()])
      await gallery.paint(canvas.name, [0], [1], [randomColor()])
      await gallery.paint(canvas.name, [1], [0], [randomColor()])
      await gallery.connect(accounts[1]).paint(canvas.name, [1], [1], [randomColor()])

      await expect(artsy
        .connect(accounts[1])
        .transferShares(canvasName, 2, accounts[0].address))
        .to.be.revertedWith('not enough shares to transfer')
    })
  })

  describe("should", () => {
    it("should mint when last pixel is painted", async () => {
      const canvasName = 'dummy canvas'
      const canvas = await createCanvas(canvasName, 3, 3, 1)

      for (let x = 0; x < canvas.maxX; x++) {
        for (let y = 0; y < canvas.maxY; y++) {
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
        } 
      }

      const managedBalance = await artsy.balanceOf(artsy.address)

      expect(managedBalance.toNumber()).to.equals(1)
      expect(await artsy.ownerOf(1)).to.equals(artsy.address)
    })

    it("transfer shares", async () => {
      const canvasName = 'dummy canvas'
      const canvas = await createCanvas(canvasName, 3, 3, 1)

      for (let x = 0; x < canvas.maxX; x++) {
        for (let y = 0; y < canvas.maxY; y++) {
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
        } 
      }

      await artsy.transferShares(canvasName, 5, accounts[1].address)

      expect(await artsy.getShares(canvasName, accounts[1].address))
        .to.equals(5)
      expect(await artsy.getShares(canvasName, signer.address))
        .to.equals(4)
    })

    it("allow to claim NFT ownership when have all the shares", async () => {
      const canvasName = 'dummy canvas'
      const canvas = await createCanvas(canvasName, 3, 3, 2)

      for (let x = 0; x < canvas.maxX; x++) {
        for (let y = 0; y < canvas.maxY; y++) {
          await gallery.paint(canvas.name, [x, x], [y, y], [randomColor(), randomColor()])
        } 
      }

      await artsy.claimOwnership(canvasName)

      const managedBalance = await artsy.balanceOf(artsy.address)
      const signerBalance = await artsy.balanceOf(signer.address)

      expect(managedBalance.toNumber()).to.equals(0)
      expect(signerBalance.toNumber()).to.equals(1)

      expect(await artsy.ownerOf(1)).to.equals(signer.address)
    })
  })

  const createCanvas = async (canvasName: string,maxX: number, maxY: number, paintsPerPixel: number): Promise<Canvas> => {
    await gallery.createCanvas(canvasName, maxX, maxY, paintsPerPixel, {gasLimit: BigNumber.from('12450000')})
    const canvas: Canvas = await gallery.canvas(canvasName)
    return canvas
  }

  const randomColor = () => {
    return randomNumber(BLACK_COLOR, WHITE_COLOR)
  }

  const randomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
})