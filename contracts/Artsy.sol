//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./structs/Art.sol";
import "./IGallery.sol";

contract Artsy is ERC721, Ownable {
  // map from tokenId to Art / Canvas name
  mapping(uint256 => string) arts;

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  IGallery private gallery;

  constructor(IGallery _gallery) ERC721("Artsy", "ART") {
    gallery = _gallery;
  }

  function createArt(string memory _canvasNameOnGallery) public onlyOwner returns(uint256) {
    uint256 tokenId = mint();
    
    require(gallery.hasFinishedCanvas(_canvasNameOnGallery), "this canvas does not exist or is not yet finished");
    arts[tokenId] = _canvasNameOnGallery;
    
    return tokenId;
  }

  function claimOwnership(string memory _canvasNameOnGallery) public {
    uint256 tokenId = gallery.getTokenId(_canvasNameOnGallery);

    uint32 shares = getShares(_canvasNameOnGallery, msg.sender);
    Art memory art = getArtData(_canvasNameOnGallery);

    require(art.totalNumberOfShares == shares, "Trying to claim ownership without having all the shares");

    _approve(msg.sender, tokenId);
    transferFrom(address(this), msg.sender, tokenId);
  }

  function transferShares(string memory _canvasName, uint32 _quantity, address _to) public {
    gallery.transferShares(_canvasName, _quantity, msg.sender, _to);
  }

  function getShares(string memory _canvasName, address _owner) view public returns(uint32) {
    return gallery.getShares(_canvasName, _owner);
  }

  function getArtData(string memory _artName) public view returns(Art memory) {
    return gallery.getFinishedArt(_artName);
  }

  function mint() internal returns(uint256) {
    _tokenIds.increment();

    uint256 tokenId = _tokenIds.current();
    _mint(address(this), tokenId);

    return tokenId;
  }

}