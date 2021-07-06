//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

import "./Pixel.sol";
import "./BoolInt.sol";

struct Canvas {
  string name;
  address owner;
  uint32 maxX;
  uint32 maxY;
  uint8 paintsPerPixel;
  uint32 remaining;
  Pixel[] pixels;
}