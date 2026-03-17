-- Migration 037: Add verification proof data for 0x350e0ffc780a6a75b44cc52e1ff9092870668945
-- Etherboard deployed November 13, 2015 (block 536,195)
-- Byte-for-byte verified with soljson v0.1.5-v0.1.7 optimizer ON, 4539 bytes runtime

UPDATE contracts SET
  etherscan_contract_name = 'Etherboard',
  compiler_language = 'solidity',
  compiler_commit = 'v0.1.5-v0.1.7 (optimizer ON)',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/etherboard-verification',
  verification_notes = 'Both init (4626 bytes) and runtime (4539 bytes) bytecode match byte-for-byte. Source from axic/etherboard GitHub repo. Compiles identically with solc v0.1.5, v0.1.6, and v0.1.7 with optimizer enabled. Created by Alex Beregszaszi (axic.eth), who later became a core Solidity compiler developer. The contract implements a 1000x1000 pixel canvas with an on-chain marketplace - users buy pixels at a minimum price of 5 finney, must outbid current owners by 110%, with a 1% trade fee. Uses compact uint16 owner IDs mapped to addresses to minimize storage for 1M pixels. Credit: axic.eth pointed out the contract and shared the original repo.',
  source_code = 'contract Etherboard {

 struct Pixel {
 uint16 owner;
 int32 color;
 uint price;
 }

 mapping(uint16 => address) public ownersById;
 mapping(address => uint16) public idsByOwner;
 uint16 public ownerIds = 1;

 Pixel[1000][1000] public pixels;

 address owner;

 uint16 constant width = 1000;
 uint16 constant height = 1000;

 uint public outbidPercent = 110;
 uint public feePercent = 1;
 uint public changePercent = 1;
 uint public minPrice = 5 finney;

 event Log(address sender, string message, uint value);
 event PixelChanged(uint16 x, uint16 y, address oldOwner, int32 oldColor, uint oldPrice, address newOwner, int32 newColor, uint newPrice);

 function Etherboard () {
 owner = msg.sender;
 }

 function setPixelRgb(uint16 x, uint16 y, int32 red, int32 green, int32 blue, int32 alpha) {
 setPixel(x, y, alpha * 127 + red * 65536 + green * 256 + blue);
 }

 function setPixel(uint16 x, uint16 y, int32 color) {
 var amountToRefund = setColorInternal(x, y, color, msg.value);
 if (amountToRefund > 0) {
 msg.sender.send(amountToRefund);
 }
 }

 function setPixelBlock(uint16[] xVals, uint16[] yVals, int32[] colors, uint[] prices) returns (bool complete) {
 if (!check (xVals.length == yVals.length, "Different number of xVals as yVals.", xVals.length) ||
 !check (xVals.length == colors.length, "Different number of xVals as colors.", xVals.length) ||
 !check (xVals.length == prices.length, "Different number of xVals as prices.", xVals.length))
 return false;
 var remainingValue = msg.value;
 uint amountToRefund = 0;
 for (uint i = 0; i < xVals.length; i++) {
 remainingValue -= prices[i];
 if (remainingValue >= 0) {
 amountToRefund += setColorInternal(xVals[i], yVals[i], colors[i], prices[i]);
 }
 }
 if (amountToRefund > 0) {
 msg.sender.send(amountToRefund);
 }
 return check(remainingValue >= 0, "Value was less than sum of prices", remainingValue);
 }

 function setColorInternal(uint16 x, uint16 y, int32 color, uint price) private returns (uint refund) {
 var oldPixel = pixels[x][y];
 var oldOwner = ownersById[oldPixel.owner];
 var minToOutbid = oldPixel.price * outbidPercent / 100;
 var sameOwnerPrice = oldPixel.price * changePercent / 100;

 if (oldOwner == msg.sender) {
 if (!check (msg.value >= sameOwnerPrice, "Changing your own pixel costs 10% of its value", sameOwnerPrice))
 return price;
 } else {
 if (!check (msg.value >= minPrice, "Minimum pixel price is 50 finney.", price) ||
 !check (msg.value >= minToOutbid, "Value must be 10% higher than current pixel price.", minToOutbid))
 return price;
 }

 if (oldOwner == msg.sender) {
 PixelChanged(x, y, oldOwner, oldPixel.color, oldPixel.price, oldOwner, color, oldPixel.price);
 pixels[x][y].color = color;
 return price - sameOwnerPrice;
 } else {
 if (oldPixel.owner > 0) {
 var fee = price * feePercent / 100;
 oldOwner.send(price - fee);
 }
 PixelChanged(x, y, oldOwner, oldPixel.color, oldPixel.price, msg.sender, color, price);
 pixels[x][y] = Pixel(getOrCreateOwnerId(msg.sender), color, price);
 return 0;
 }
 }

 function check(bool condition, string message, uint value) returns (bool pass) {
 if (!condition) {
 Log(msg.sender, message, value);
 }
 return condition;
 }

 function getRow(uint16 y) returns (address[1000] owners, int32[1000] colors, uint[1000] prices) {
 for (uint16 x = 0; x < width; x++) {
 owners[x] = ownersById[pixels[x][y].owner];
 colors[x] = pixels[x][y].color;
 prices[x] = pixels[x][y].price;
 }
 }

 function getPixel(uint16 x, uint16 y) returns (address owner, int32 color, uint price) {
 owner = ownersById[pixels[x][y].owner];
 color = pixels[x][y].color;
 price = pixels[x][y].price;
 }

 function setPixelsOwnersAndPrices(uint16[] xs, uint16[] ys, address pixelOwner, int32[] colors, uint[] prices) {
 if (msg.sender == owner) {
 for (uint i = 0; i < xs.length; i++) {
 pixels[xs[i]][ys[i]] = Pixel(getOrCreateOwnerId(pixelOwner), colors[i], prices[i]);
 }
 }
 }

 function getOrCreateOwnerId(address owner) internal returns (uint16 ownerId) {
 ownerId = idsByOwner[owner];
 if (ownerId == 0) {
 ownerId = ++ownerIds;
 ownersById[ownerId] = owner;
 idsByOwner[owner] = ownerId;
 }
 return ownerId;
 }

 function setFeePercent(uint price) {
 if (msg.sender == owner)
 feePercent = price;
 }

 function setMinPrice(uint percent) {
 if (msg.sender == owner)
 minPrice = percent;
 }

 function setOutbidPercent(uint percent) {
 if (msg.sender == owner)
 outbidPercent = percent;
 }

 function setChangePercent(uint percent) {
 if (msg.sender == owner)
 changePercent = percent;
 }

 function empty() {
 if (msg.sender == owner)
 owner.send(this.balance);
 }
}'
WHERE address = '0x350e0ffc780a6a75b44cc52e1ff9092870668945';
