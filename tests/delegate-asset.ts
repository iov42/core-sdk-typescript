import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IAddDelegateRequest, IAuthorisedRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType, ICreateAssetRequest, ICreateAssetTypeRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId: string;
let delegateIdentityId: string;
let requestId: string
let keyPair: IKeyPairData;
let delegateKeyPair: IKeyPairData;
let uniqueAssetTypeId: string;
let quantifiableAssetTypeId: string;
let uniqueAssetId: string;
let accountId: string;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];


inputs.forEach(input => {

    describe(`Testing asset methods using delegate with protocolId="${input.protocolId}"`, function () {

        before('Initializing identities, asset types', () => {
            identityId = uuidv4();
            delegateIdentityId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);
            delegateKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, delegateIdentityId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request, keyPair)
            .then( () => {
                const request2: ICreateIdentityRequest = {
                    identityId: delegateIdentityId,
                    publicCredentials : {
                        key: delegateKeyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request2, delegateKeyPair);
            })
            .then( () => {
                const request: IAddDelegateRequest = {
                    _type: "AddDelegateRequest",
                    delegateIdentityId,
                    delegatorIdentityId: identityId,
                    requestId: uuidv4(),
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    delegateKeyPair
                );
                return platformClient.addDelegate(finalRequest, keyPair);
            })
            .then( () => {
                uniqueAssetTypeId = uuidv4();
                const request: ICreateAssetTypeRequest = {
                    assetTypeId: uniqueAssetTypeId,
                    type: "Unique",
                    requestId: uuidv4(),
                }
                return platformClient.createAssetType(request, keyPair)
            })
            .then( () => {
                quantifiableAssetTypeId = uuidv4();
                const request: ICreateAssetTypeRequest = {
                    assetTypeId: quantifiableAssetTypeId,
                    requestId: uuidv4(),
                    scale: 2,
                    type: "Quantifiable",
                }
                return platformClient.createAssetType(request, keyPair)
            })
        });

        describe("Create new unique asset", () => {
            it("should return success", async () => {
                uniqueAssetId = uuidv4();
                requestId = uuidv4()
                const request: ICreateAssetRequest = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    requestId,
                }

                const response = await platformClient.createAsset(request, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(1);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}/assets/${request.assetId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve unique asset", () => {
            it("should return success", async () => {
                const response = await platformClient.getAsset(uniqueAssetId, uniqueAssetTypeId, delegateKeyPair, identityId);
                expect(response.assetId).to.equal(uniqueAssetId);
                expect(response.assetTypeId).to.equal(uniqueAssetTypeId);
                expect(response.ownerId).to.equal(identityId);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Create new quantifiable asset", () => {
            it("should return success", async () => {
                accountId = uuidv4();
                requestId = uuidv4();
                const request: ICreateAssetRequest = {
                    assetId: accountId,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "100",
                    requestId,
                }

                const response = await platformClient.createAsset(request, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(1);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}/assets/${request.assetId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve account", () => {
            it("should return success", async () => {
                const response = await platformClient.getAsset(accountId, quantifiableAssetTypeId, delegateKeyPair, identityId);
                expect(response.assetId).to.equal(accountId);
                expect(response.assetTypeId).to.equal(quantifiableAssetTypeId);
                expect(response.quantity).to.equal("100");
                expect(response.ownerId).to.equal(identityId);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Adds a quantity to balance of quantifiable asset", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                const request: ICreateAssetRequest = {
                    assetId: accountId,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "100",
                    requestId,
                }

                const response = await platformClient.addAssetQuantity(request, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(1);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}/assets/${request.assetId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve account after adding to balance", () => {
            it("should return success", async () => {
                const response = await platformClient.getAsset(accountId, quantifiableAssetTypeId, delegateKeyPair, identityId);
                expect(response.assetId).to.equal(accountId);
                expect(response.assetTypeId).to.equal(quantifiableAssetTypeId);
                expect(response.quantity).to.equal("200");
                expect(response.ownerId).to.equal(identityId);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

    });
});
