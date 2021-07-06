import ArtsyArtifact from "../artifacts/contracts/Artsy.sol/Artsy.json"
import { Artsy } from "../typechain/Artsy"

import IGalleryArtifact from "../artifacts/contracts/IGallery.sol/IGallery.json"

import { expect } from 'chai'
import { ethers } from 'hardhat'
import { waffle } from 'hardhat'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Wallet } from "@ethersproject/wallet"
import { MockContract } from "ethereum-waffle"

const { deployContract, deployMockContract, provider } = waffle

describe("Artsy", () => {
  let artsy: Artsy
  let gallery: MockContract

  let signer: Wallet
  let wallets: Wallet[]
  let accounts: SignerWithAddress[]

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    wallets = provider.getWallets()
    signer = wallets[0]

    gallery = (await deployMockContract(signer, IGalleryArtifact.abi))
    artsy = (await deployContract(signer, ArtsyArtifact, [gallery.address])) as Artsy
  })

  describe("should not", () => {
    it("create art from unfinished canvas", async () => {
      await gallery.mock.hasFinishedCanvas.returns(false)

      await expect(artsy.createArt('the canvas'))
        .to.be
        .revertedWith('this canvas does not exist or is not yet finished')
    })
  })

  describe("should", () => {
    it("mint when creating art", async () => {
      await gallery.mock.hasFinishedCanvas.returns(true)

      await artsy.createArt('the canvas')

      const balanceOfContract = await artsy.balanceOf(artsy.address)

      expect(balanceOfContract.toNumber()).to.equals(1)
      expect(await artsy.ownerOf(1)).to.equals(artsy.address)
    })

    it("return art data from galery", async () => {
      const canvasName = 'the canvas'

      const artDataToReturn = {
        name: canvasName,
        dimentsionX: 2,
        dimentsionY: 2,
        totalNumberOfShares: 4,
        pixels: [
          { value: 0, x: 0, y: 0, artists: [signer.address], allValues: [0] },
          { value: 0, x: 0, y: 1, artists: [signer.address], allValues: [0] },
          { value: 0, x: 1, y: 0, artists: [signer.address], allValues: [0] },
          { value: 0, x: 1, y: 1, artists: [signer.address], allValues: [0] }
        ]
      }

      await gallery.mock.hasFinishedCanvas.returns(true)
      await gallery.mock.getFinishedArt.returns(artDataToReturn)

      await artsy.createArt(canvasName)
      const art = await artsy.getArtData(canvasName)

      expect(art.name).to.equals(artDataToReturn.name)
      expect(art.dimentsionX).to.equals(artDataToReturn.dimentsionX)
      expect(art.dimentsionY).to.equals(artDataToReturn.dimentsionY)
      expect(art.totalNumberOfShares).to.equals(artDataToReturn.totalNumberOfShares)

      for (let i = 0; i < art.pixels.length; i++) {
        const expectedPixel = artDataToReturn.pixels[i]
        const returnedPixel = art.pixels[i]

        expect(expectedPixel.x).to.equals(returnedPixel.x)
        expect(expectedPixel.y).to.equals(returnedPixel.y)
        expect(expectedPixel.value).to.equals(returnedPixel.value)
        expect(expectedPixel.artists[0]).to.equals(returnedPixel.artists[0])
        expect(expectedPixel.allValues[0]).to.equals(returnedPixel.allValues[0])
      }
    })

    it("transfer shares", async () => {
      await gallery.mock.hasFinishedCanvas.returns(true)

      await artsy.createArt('the canvas')
    })
  })
})