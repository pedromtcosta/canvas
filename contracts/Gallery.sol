//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./structs/Art.sol";
import "./structs/Canvas.sol";
import "./structs/CanvasAdditionalData.sol";
import "./structs/Pixel.sol";

import "./Artsy.sol";
import "./IGallery.sol";

contract Gallery is IGallery {
  using SafeMath for uint32;

  mapping(string => Canvas) public canvas;
  mapping(string => CanvasAdditionalData) private canvasAdditionalData;

  Artsy public artsy;

  constructor() {
    artsy = new Artsy(this);
  }

  function createCanvas(string memory _name, uint32 _maxX, uint32 _maxY, uint8 _paintsPerPixel) public {
    require(bytes(_name).length > 0, "cannot create canvas with blank name");
    require(_maxX > 0 && _maxX <= 2000 && _maxY > 0 && _maxY <= 2000, "invalid canvas dimensions");
    require(_paintsPerPixel > 0 && _paintsPerPixel <= 5, "invalid quantity of paints per pixel");

    CanvasAdditionalData storage additional = canvasAdditionalData[_name];
    
    require(!additional.created, "a canvas with the same name already exists");

    Canvas storage theCanvas = canvas[_name];

    theCanvas.name = _name;
    theCanvas.owner = msg.sender;
    theCanvas.maxX = _maxX;
    theCanvas.maxY = _maxY;
    theCanvas.paintsPerPixel = _paintsPerPixel;
    theCanvas.remaining = _maxX * _maxY * _paintsPerPixel;

    additional.created = true;
  }

  function paint(string memory _name, uint32[] memory _xs, uint32[] memory _ys, uint32[] memory _values) public {
    Canvas storage theCanvas = canvas[_name];
    CanvasAdditionalData storage additional = canvasAdditionalData[_name];

    require(bytes(theCanvas.name).length > 0, "canvas not found!");
    require(additional.created, "canvas not found!");

    for (uint32 i = 0; i < _values.length; i++) {
      uint32 x = _xs[i];
      uint32 y = _ys[i];
      uint32 value = _values[i];

      require(x < theCanvas.maxX && x >= 0 && y < theCanvas.maxY && y >= 0, "cannot paint outside the canvas coordinates");
      // no need to validate >= 0 because we're using unsingned integers
      require(value <= 16777215, "invalid color value, should be between 0 and 16777215");

      paintInternal(_name, x, y, value);
    }

    if (theCanvas.remaining == 0) {
      uint256 tokenId = artsy.createArt(_name);
      additional.tokenId = tokenId;
    }
  }

  function paintInternal(string memory _name, uint32 _x, uint32 _y, uint32 _value) internal {
    Canvas storage theCanvas = canvas[_name];
    CanvasAdditionalData storage additional = canvasAdditionalData[_name];
    
    uint32 pixelLocation = _x * theCanvas.maxY + _y;
    BoolInt storage locationOnArray = additional.pixelMap[pixelLocation];

    if (!locationOnArray.hasValue) {
      // first paint on these coordinates
      // mark the location on array for the coordinates
      locationOnArray.value = uint32(theCanvas.pixels.length);
      locationOnArray.hasValue = true;

      theCanvas.pixels.push();
      Pixel storage pixel = theCanvas.pixels[theCanvas.pixels.length - 1];
      
      pixel.value = _value;
      pixel.x = _x;
      pixel.y = _y;
      pixel.artists.push(msg.sender);
      pixel.allValues.push(_value);
    } else {
      Pixel storage pixel = theCanvas.pixels[locationOnArray.value];

      require(pixel.allValues.length < theCanvas.paintsPerPixel, "amount of paints exceeded for this pixel");

      pixel.value = _value;
      pixel.artists.push(msg.sender);
      pixel.allValues.push(_value);
    }

    theCanvas.remaining = theCanvas.remaining - 1;
    if (additional.shares[msg.sender] == 0) {
      additional.artists.push(msg.sender);
    }
    additional.shares[msg.sender] = additional.shares[msg.sender] + 1;
  }

  function getPixels(string memory _name) view public returns(Pixel[] memory) {
    return canvas[_name].pixels;
  }

  function getFinishedArt(string memory _canvasName) view override public returns(Art memory) {
    Canvas storage theCanvas = canvas[_canvasName];
    CanvasAdditionalData storage additional = canvasAdditionalData[_canvasName];

    require(additional.created, "this art does not exist");
    require(theCanvas.remaining == 0, "this art is not finished yet!");

    uint32 totalNumberOfShares = theCanvas.maxX * theCanvas.maxY * theCanvas.paintsPerPixel;
    Pixel[] memory pixels = getPixels(_canvasName);
    Art memory art = Art(theCanvas.name, theCanvas.maxX, theCanvas.maxY, totalNumberOfShares, pixels);

    return art;
  }

  function hasFinishedCanvas(string memory _canvasName) view override public returns(bool) {
    Canvas storage theCanvas = canvas[_canvasName];
    CanvasAdditionalData storage additional = canvasAdditionalData[_canvasName];

    return additional.created && theCanvas.remaining == 0;
  }

  function getShares(string memory _canvasName, address _owner) view override public returns(uint32) {
    CanvasAdditionalData storage additional = canvasAdditionalData[_canvasName];

    require(additional.created, "this canvas does not exists");

    return additional.shares[_owner];
  }

  function transferShares(string memory _canvasName, uint32 _quantity, address _from, address _to) override public {
    require(msg.sender == address(artsy), "transfer the shares through the Artsy contract");
    
    CanvasAdditionalData storage additional = canvasAdditionalData[_canvasName];

    require(additional.created, "this canvas does not exists");
    require(additional.shares[_from] >= _quantity, "not enough shares to transfer");

    additional.shares[_from] = uint32(additional.shares[_from].sub(_quantity));
    additional.shares[_to] = uint32(additional.shares[_to].add(_quantity));
  }

  function getTokenId(string memory _canvasName) view override public returns(uint256) {
    CanvasAdditionalData storage additional = canvasAdditionalData[_canvasName];

    require(additional.created, "this canvas does not exists");

    return additional.tokenId;
  }
}
