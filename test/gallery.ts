import GalleryArtifact from "../artifacts/contracts/Gallery.sol/Gallery.json"
import { Gallery } from "../typechain/Gallery"

import { expect } from 'chai'
import { ethers } from 'hardhat'
import { waffle } from 'hardhat'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Wallet } from "@ethersproject/wallet"
import { BigNumber } from "@ethersproject/bignumber"
import { Canvas } from "./models/canvas"
import { BLACK_COLOR, WHITE_COLOR } from "./core/consts"
import { Pixel } from "./models/pixel"

const { deployContract, provider } = waffle

describe("Gallery", () => {
  let gallery: Gallery

  let signer: Wallet
  let wallets: Wallet[]
  let accounts: SignerWithAddress[]

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    wallets = provider.getWallets()
    signer = wallets[0]
    gallery = (await deployContract(signer, GalleryArtifact)) as Gallery
  })

  describe("should not", () => {
    describe("create canvas", () => {
      it("with same name", async() => {
        const canvasName = 'dummy canvas'
        const x = 3
        const y = 2
        const paintsPerPixel = 3
    
        await gallery.createCanvas(canvasName, x, y, paintsPerPixel)
    
        await expect(gallery.createCanvas(canvasName, x, y, paintsPerPixel))
          .to.be
          .revertedWith('a canvas with the same name already exists')
      })
  
      it("with blank name", async() => {
        await expect(gallery.createCanvas('', 3, 3, 3))
          .to.be
          .revertedWith('cannot create canvas with blank name')
      })

      it("with max X 0", async() => {
        await expect(gallery.createCanvas('dummy canvas', 0, 3, 3))
          .to.be
          .revertedWith('invalid canvas dimensions')
      })

      it("with max Y 0", async() => {
        await expect(gallery.createCanvas('dummy canvas', 3, 0, 3))
          .to.be
          .revertedWith('invalid canvas dimensions')
      })

      it("with paints per pixel 0", async() => {
        await expect(gallery.createCanvas('dummy canvas', 3, 3, 0))
          .to.be
          .revertedWith('invalid quantity of paints per pixel')
      })

      it("with max X bigger than 2000", async() => {
        await expect(gallery.createCanvas('dummy canvas', 2001, 3, 3))
          .to.be
          .revertedWith('invalid canvas dimensions')
      })

      it("with max Y bigger than 2000", async() => {
        await expect(gallery.createCanvas('dummy canvas', 3, 2001, 3))
          .to.be
          .revertedWith('invalid canvas dimensions')
      })

      it("with paints per pixel bigger than 5", async() => {
        await expect(gallery.createCanvas('dummy canvas', 3, 3, 6))
          .to.be
          .revertedWith('invalid quantity of paints per pixel')
      })
    })

    describe("paint", () => {
      it("more than paints per pixel", async () => {
        const canvas = await createCanvas('dummy canvas', 3, 3, 3)
  
        await gallery.paint(canvas.name, [1], [1], [BLACK_COLOR])
        await gallery.paint(canvas.name, [1], [1], [BLACK_COLOR])
        await gallery.paint(canvas.name, [1], [1], [BLACK_COLOR])
  
        await expect(gallery.paint(canvas.name, [1], [1], [BLACK_COLOR]))
              .to
              .be
              .revertedWith('amount of paints exceeded for this pixel')
      })
  
      it("X and Y outside of coordinates", async () => {
        const canvas = await createCanvas('dummy canvas', 3, 3, 3)
  
        await expect(gallery.paint(canvas.name, [3], [3], [BLACK_COLOR]))
              .to
              .be
              .revertedWith('cannot paint outside the canvas coordinates')
      })
  
      it("X outside of coordinates", async () => {
        const canvas = await createCanvas('dummy canvas', 3, 3, 3)
  
        await expect(gallery.paint(canvas.name, [3], [0], [BLACK_COLOR]))
              .to
              .be
              .revertedWith('cannot paint outside the canvas coordinates')
      })
  
      it("Y outside of coordinates", async () => {
        const canvas = await createCanvas('dummy canvas', 3, 3, 3)
  
        await expect(gallery.paint(canvas.name, [0], [3], [BLACK_COLOR]))
              .to
              .be
              .revertedWith('cannot paint outside the canvas coordinates')
      })
  
      it("color greater than FFFFFF", async () => {
        const canvas = await createCanvas('dummy canvas', 3, 3, 3)
  
        await expect(gallery.paint(canvas.name, [0], [0], [16777216]))
              .to
              .be
              .revertedWith('invalid color value, should be between 0 and 16777215')
      })
  
      it("on innexistent canvas", async () => {
        await expect(gallery.paint("not existent", [0], [0], [0]))
              .to
              .be
              .revertedWith('canvas not found!')
      })
    })

    it("get art from unnexistent canvas", async () => {
      await expect(gallery.getFinishedArt('not existent'))
        .to.be
        .revertedWith('this art does not exist')
    })

    it("get unfinished art", async () => {
      const canvasName = 'dummy canvas'
      let canvas = await createCanvas(canvasName, 3, 3, 3)

      await expect(gallery.getFinishedArt(canvasName))
        .to.be
        .revertedWith('this art is not finished yet!')
    })

    it("should return false saying that the canvas is not finished", async () => {
      const canvasName = 'dummy canvas'
      await createCanvas(canvasName, 3, 3, 3)

      expect(await gallery.hasFinishedCanvas(canvasName))
        .to.be.false
    })
  })

  describe("should", () => {
    it("create blank canvas", async () => {
      await createBlankCanvasTest('dummy canvas', 3, 2, 3)
    })

    it("create big canvas", async () => {
      await createBlankCanvasTest('dummy canvas', 500, 500, 3)
    })
    
    it("paint", async () => {
      const canvas = await createCanvas('dummy canvas', 3, 3, 3)

      await gallery.paint(canvas.name, [1], [1], [BLACK_COLOR])

      const pixels = await gallery.getPixels(canvas.name)

      expect(pixels.length).to.equals(1)

      const pixel = pixels[0] as Pixel

      expect(pixel.x).to.equals(1)
      expect(pixel.y).to.equals(1)
      expect(pixel.value).to.equals(BLACK_COLOR)
      expect(pixel.allValues.length).to.equals(1)
      expect(pixel.artists.length).to.equals(1)
      expect(pixel.artists[0]).to.equals(signer.address)
    })

    it("paint two pixels", async () => {
      const canvas = await createCanvas('dummy canvas', 3, 3, 3)

      await gallery.paint(canvas.name, [0], [0], [BLACK_COLOR])
      await gallery.paint(canvas.name, [1], [1], [WHITE_COLOR])

      const pixels = await gallery.getPixels(canvas.name)

      expect(pixels.length).to.equals(2)

      const pixel1 = pixels[0] as Pixel
      expect(pixel1.x).to.equals(0)
      expect(pixel1.y).to.equals(0)
      expect(pixel1.value).to.equals(BLACK_COLOR)
      expect(pixel1.allValues.length).to.equals(1)
      expect(pixel1.artists.length).to.equals(1)

      const pixel2 = pixels[1] as Pixel
      expect(pixel2.x).to.equals(1)
      expect(pixel2.y).to.equals(1)
      expect(pixel2.value).to.equals(WHITE_COLOR)
      expect(pixel2.allValues.length).to.equals(1)
      expect(pixel2.artists.length).to.equals(1)
    })

    it("paint over", async () => {
      const canvas = await createCanvas('dummy canvas', 3, 3, 3)

      await gallery.paint(canvas.name, [0], [0], [BLACK_COLOR])
      await gallery.paint(canvas.name, [0], [0], [WHITE_COLOR])

      const pixels = await gallery.getPixels(canvas.name)

      expect(pixels.length).to.equals(1)

      const pixel = pixels[0] as Pixel
      expect(pixel.x).to.equals(0)
      expect(pixel.y).to.equals(0)
      expect(pixel.value).to.equals(WHITE_COLOR)
      expect(pixel.allValues.length).to.equals(2)
      expect(pixel.artists.length).to.equals(2)
    })

    it("have remaining pixels 0 when canvas is finished", async () => {
      let canvas = await createCanvas('dummy canvas', 3, 3, 3)

      for (let x = 0; x < canvas.maxX; x++) {
        for (let y = 0; y < canvas.maxY; y++) {
          await gallery.paint(canvas.name, [x], [y], [WHITE_COLOR])
          await gallery.paint(canvas.name, [x], [y], [WHITE_COLOR])
          await gallery.paint(canvas.name, [x], [y], [WHITE_COLOR])
        } 
      }
      
      canvas = await gallery.canvas(canvas.name)

      expect(canvas.remaining).to.equals(0)
    })

    it("get finished art", async () => {
      const canvasName = 'dummy canvas'
      let canvas = await createCanvas(canvasName, 3, 3, 3)

      for (let x = 0; x < canvas.maxX; x++) {
        for (let y = 0; y < canvas.maxY; y++) {
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
        } 
      }

      const art = await gallery.getFinishedArt(canvasName)
      const pixels = await gallery.getPixels(canvasName)
      canvas = await gallery.canvas(canvasName)

      expect(art.name).to.equals(canvas.name)
      expect(art.dimentsionX).to.equals(canvas.maxX)
      expect(art.dimentsionY).to.equals(canvas.maxY)

      for (let i = 0; i < art.pixels.length; i++) {
        const artPixel = art.pixels[i]
        const canvasPixel = pixels[i]
        expect(artPixel.x).to.equals(canvasPixel.x)
        expect(artPixel.y).to.equals(canvasPixel.y)
        expect(artPixel.value).to.equals(canvasPixel.value)
      }
    })

    it("paint properly sending multiple xs, ys and values", async () => {
      const canvasName = 'dummy canvas'
      let canvas = await createCanvas(canvasName, 3, 3, 3)

      for (let i = 0; i < canvas.paintsPerPixel; i++) {
        await gallery.paint(canvas.name, [0, 0, 0], [0, 1, 2], [randomColor(), randomColor(), randomColor()])
        await gallery.paint(canvas.name, [1, 1, 1], [0, 1, 2], [randomColor(), randomColor(), randomColor()])
        await gallery.paint(canvas.name, [2, 2, 2], [0, 1, 2], [randomColor(), randomColor(), randomColor()])
      }

      const art = await gallery.getFinishedArt(canvasName)
      const pixels = await gallery.getPixels(canvasName)
      canvas = await gallery.canvas(canvasName)

      expect(art.name).to.equals(canvas.name)
      expect(art.dimentsionX).to.equals(canvas.maxX)
      expect(art.dimentsionY).to.equals(canvas.maxY)

      for (let i = 0; i < art.pixels.length; i++) {
        const artPixel = art.pixels[i]
        const canvasPixel = pixels[i]
        expect(artPixel.x).to.equals(canvasPixel.x)
        expect(artPixel.y).to.equals(canvasPixel.y)
        expect(artPixel.value).to.equals(canvasPixel.value)
      }
    })

    it("return true saying that has the finished canvas", async () => {
      const canvasName = 'dummy canvas'
      let canvas = await createCanvas(canvasName, 3, 3, 3)

      for (let x = 0; x < canvas.maxX; x++) {
        for (let y = 0; y < canvas.maxY; y++) {
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
          await gallery.paint(canvas.name, [x], [y], [randomColor()])
        } 
      }

      expect(await gallery.hasFinishedCanvas(canvasName))
        .to.be.true
    })

    it("store the number of shares when it is equal", async () => {
      const canvasName = 'dummy canvas'
      let canvas = await createCanvas(canvasName, 3, 3, 1)

      await gallery
        .connect(accounts[0])
        .paint(canvas.name, [0, 0, 0], [0, 1, 2], [randomColor(), randomColor(), randomColor()])

      await gallery
        .connect(accounts[1])
        .paint(canvas.name, [1, 1, 1], [0, 1, 2], [randomColor(), randomColor(), randomColor()])

      await gallery
        .connect(accounts[2])
        .paint(canvas.name, [2, 2, 2], [0, 1, 2], [randomColor(), randomColor(), randomColor()])

      expect(await gallery.getShares(canvasName, accounts[0].address))
        .to.equals(3)

      expect(await gallery.getShares(canvasName, accounts[1].address))
        .to.equals(3)
      
      expect(await gallery.getShares(canvasName, accounts[2].address))
        .to.equals(3)
    })
  })

  const createBlankCanvasTest = async (canvasName: string, maxX: number, maxY: number, paintsPerPixel: number) => {
    const canvas = await createCanvas(canvasName, maxX, maxY, paintsPerPixel);

    expect(canvas.name).to.equals(canvasName)
    expect(canvas.maxX).to.equals(maxX)
    expect(canvas.maxY).to.equals(maxY)
    expect(canvas.paintsPerPixel).to.equals(paintsPerPixel)
    expect(canvas.remaining).to.equals(maxX * maxY * paintsPerPixel)
  }

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
