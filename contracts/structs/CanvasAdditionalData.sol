//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

import "./Pixel.sol";
import "./BoolInt.sol";

struct CanvasAdditionalData {
  bool created;
  address[] artists;
  mapping(address => uint32) shares;
  mapping(uint32 => BoolInt) pixelMap;
  uint256 tokenId;
}