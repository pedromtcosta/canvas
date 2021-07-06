//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

struct Pixel {
  uint32 value;
  uint32 x;
  uint32 y;
  address[] artists;
  uint32[] allValues;
}