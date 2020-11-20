import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IAuthorisedRequest, IKeyPairData, ITransferOwnership, ITransferRequest, PlatformClient, PlatformUtils, ProtocolIdType, ICreateAssetRequest, ICreateAssetTypeRequest, ICreateIdentityRequest, ITransferItem, ITransferQuantity, ITransferQuery } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId1: string;
let identityId2: string;
let requestId: string
let keyPair1: IKeyPairData;
let keyPair2: IKeyPairData;
let uniqueAssetTypeId: string;
let quantifiableAssetTypeId: string;
let uniqueAssetId: string;
let accountId1: string;
let accountId2: string;
let next: string;

const inputs = [ /*
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    }, */
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];


inputs.forEach(input => {

    describe(`Testing transaction methods with protocolId="${input.protocolId}"`, function () {
        this.timeout(60000);

        before('Initializing identities, asset types', () => {
            identityId1 = uuidv4();
            identityId2 = uuidv4();
            accountId1 = uuidv4();
            accountId2 = uuidv4();
            keyPair1 = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId1);
            keyPair2 = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId2);

            const request: ICreateIdentityRequest = {
                identityId: identityId1,
                publicCredentials: {
                    key: keyPair1.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request, keyPair1)
            .then( () => {
                const request: ICreateIdentityRequest = {
                    identityId: identityId2,
                    publicCredentials: {
                        key: keyPair2.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request, keyPair2)
            })
            .then( () => {
                uniqueAssetTypeId = uuidv4();
                const request: ICreateAssetTypeRequest = {
                    assetTypeId: uniqueAssetTypeId,
                    type: "Unique",
                    requestId: uuidv4(),
                }
                return platformClient.createAssetType(request, keyPair1)
            })
            .then( () => {
                quantifiableAssetTypeId = uuidv4();
                const request: ICreateAssetTypeRequest = {
                    assetTypeId: quantifiableAssetTypeId,
                    requestId: uuidv4(),
                    scale: 2,
                    type: "Quantifiable",
                }
                return platformClient.createAssetType(request, keyPair1)
            })
            .then( () => {
                uniqueAssetId = uuidv4();
                requestId = uuidv4()
                const request: ICreateAssetRequest = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    requestId,
                }
                return platformClient.createAsset(request, keyPair1);
            })
            .then( () => {
                requestId = uuidv4();
                const request: ICreateAssetRequest = {
                    assetId: accountId1,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "0",
                    requestId,
                }
                return platformClient.createAsset(request, keyPair1);
            })
            .then( () => {
                requestId = uuidv4();
                const request: ICreateAssetRequest = {
                    assetId: accountId2,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "100",
                    requestId,
                }
                return platformClient.createAsset(request, keyPair2);
            })
            .then( () => {
                requestId = uuidv4();
                const transfer: ITransferOwnership = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    fromIdentityId: identityId1,
                    toIdentityId: identityId2,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair1);
                return platformClient.transferAssets(signedRequest, keyPair1)
            })
            .then( () => {
                requestId = uuidv4();
                const transfer: ITransferQuantity = {
                    assetTypeId: quantifiableAssetTypeId,
                    fromAssetId: accountId2,
                    quantity: "25",
                    toAssetId: accountId1,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair2);
                return platformClient.transferAssets(signedRequest, keyPair2)
            })
            .then( () => {
                requestId = uuidv4();
                const transfer: ITransferQuantity = {
                    assetTypeId: quantifiableAssetTypeId,
                    fromAssetId: accountId2,
                    quantity: "25",
                    toAssetId: accountId1,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair2);
                return platformClient.transferAssets(signedRequest, keyPair2)
            })
            .then( () => {
                requestId = uuidv4();
                const transfer: ITransferQuantity = {
                    assetTypeId: quantifiableAssetTypeId,
                    fromAssetId: accountId2,
                    quantity: "25",
                    toAssetId: accountId1,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair2);
                return platformClient.transferAssets(signedRequest, keyPair2)
            })

        });

        describe("Retrieves transations for unique asset", () => {
            it("should return success", async () => {
                const query: ITransferQuery = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                };
                return platformClient.getTransactions(query, keyPair2)
                .then( (response) => {
                    expect(response.transactions.length).to.equal(1);
                    expect(response.transactions[0].fromOwner).to.equal(identityId1);
                    expect(response.transactions[0].toOwner).to.equal(identityId2);
                    expect(response.transactions[0].asset.assetId).to.equal(uniqueAssetId);
                    expect(response.transactions[0].asset.assetTypeId).to.equal(uniqueAssetTypeId);
                    expect(response.transactions[0].requestId).to.exist;
                    expect(response.transactions[0].proof).to.exist;
                    expect(response.transactions[0].transactionTimestamp).to.exist;
                });
            });
        });

        describe("Retrieve transactions for quantifiable asset", () => {
            it("should return success", async () => {
                const query: ITransferQuery = {
                    assetId: accountId2,
                    assetTypeId: quantifiableAssetTypeId,
                    limit: 2,
                };
                return platformClient.getTransactions(query,  keyPair2)
                .then( (response) => {
                    expect(response.next).to.exist;
                    expect(response.transactions.length).to.equal(2);
                    expect(response.transactions[0].sender.assetId).to.equal(accountId2);
                    expect(response.transactions[0].sender.assetTypeId).to.equal(quantifiableAssetTypeId);
                    expect(response.transactions[0].recipient.assetId).to.equal(accountId1);
                    expect(response.transactions[0].recipient.assetTypeId).to.equal(quantifiableAssetTypeId);
                    expect(response.transactions[0].quantity).to.equal("25");
                    expect(response.transactions[0].requestId).to.exist;
                    expect(response.transactions[0].proof).to.exist;
                    expect(response.transactions[0].transactionTimestamp).to.exist;

                    expect(response.transactions[1].sender.assetId).to.equal(accountId2);
                    expect(response.transactions[1].sender.assetTypeId).to.equal(quantifiableAssetTypeId);
                    expect(response.transactions[1].recipient.assetId).to.equal(accountId1);
                    expect(response.transactions[1].recipient.assetTypeId).to.equal(quantifiableAssetTypeId);
                    expect(response.transactions[1].quantity).to.equal("25");
                    expect(response.transactions[1].requestId).to.exist;
                    expect(response.transactions[1].proof).to.exist;
                    expect(response.transactions[1].transactionTimestamp).to.exist;
                    next = response.next;
                });
            });
        });

        describe("Retrieve transactions for quantifiable asset", () => {
            it("should return success", async () => {
                const query: ITransferQuery = {
                    assetId: accountId2,
                    assetTypeId: quantifiableAssetTypeId,
                    next,
                };
                return platformClient.getTransactions(query,  keyPair2)
                .then( (response) => {
                    next = response.next;
                    expect(response.transactions.length).to.equal(1);
                    expect(response.transactions[0].sender.assetId).to.equal(accountId2);
                    expect(response.transactions[0].sender.assetTypeId).to.equal(quantifiableAssetTypeId);
                    expect(response.transactions[0].recipient.assetId).to.equal(accountId1);
                    expect(response.transactions[0].recipient.assetTypeId).to.equal(quantifiableAssetTypeId);
                    expect(response.transactions[0].quantity).to.equal("25");
                    expect(response.transactions[0].requestId).to.exist;
                    expect(response.transactions[0].proof).to.exist;
                    expect(response.transactions[0].transactionTimestamp).to.exist;
                    expect(response.next).not.to.exist;
                });
            });
        });

    });
});
