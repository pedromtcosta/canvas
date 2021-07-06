//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

import "./structs/Art.sol";
import "./Artsy.sol";

interface IGallery {
  function getFinishedArt(string memory _canvasName) view external returns(Art memory);
  function hasFinishedCanvas(string memory _canvasName) view external returns(bool);
  function getShares(string memory _canvasName, address _owner) view external returns(uint32);
  function transferShares(string memory _canvasName, uint32 _quantity, address _from, address _to) external;
  function getTokenId(string memory _canvasName) view external returns(uint256);
}