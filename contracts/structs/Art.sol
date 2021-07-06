//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

import "./Pixel.sol";

struct Art {
  string name;
  uint32 dimentsionX;
  uint32 dimentsionY;
  uint32 totalNumberOfShares;
  Pixel[] pixels;
}