import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IAuthorisedRequest, IEndorseClaimsRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType, ICreateAssetRequest, ICreateAssetTypeRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId: string;
let endorserId: string;
let requestId: string
let keyPair: IKeyPairData;
let endorserKeyPair: IKeyPairData;
let uniqueAssetTypeId: string;
let quantifiableAssetTypeId: string;
let uniqueAssetId: string;
let accountId: string;
let endorsements: any;
const claims = [
    "property1:value10",
    "property2:value20",
    "property3:value30",
];

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];


inputs.forEach(input => {

    describe(`Testing endorsement methods with protocolId="${input.protocolId}"`, function () {
        this.timeout(60000);

        before('Initializing identities, asset types', () => {
            identityId = uuidv4();
            endorserId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);
            endorserKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, endorserId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request, keyPair)
            .then( () => {
                const request: ICreateIdentityRequest = {
                    identityId: endorserId,
                    publicCredentials: {
                        key: endorserKeyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request, endorserKeyPair)
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
            .then( () => {
                uniqueAssetId = uuidv4();
                requestId = uuidv4()
                const request: ICreateAssetRequest = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    requestId,
                }
                return platformClient.createAsset(request, keyPair)
            })
            .then( () => {
                accountId = uuidv4();
                requestId = uuidv4();
                const request: ICreateAssetRequest = {
                    assetId: accountId,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "100",
                    requestId,
                }
                return platformClient.createAsset(request, keyPair)
            })
        });

        describe("Endorse claims on identity", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                endorsements = platformUtils.createEndorsementsObject(
                    identityId,
                    claims,
                    endorserKeyPair);
                const request: IEndorseClaimsRequest = {
                    _type: "CreateIdentityEndorsementsRequest",
                    endorserId: endorserId,
                    endorsements: endorsements,
                    requestId,
                    subjectId: identityId,
                }
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    endorserKeyPair
                );
                const response = await platformClient.endorseIdentityClaims(finalRequest, claims, endorserKeyPair);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(6);
                expect(response.resources[0]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[0])}/endorsements/${endorserId}`);
                expect(response.resources[2]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[3]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[1])}/endorsements/${endorserId}`);
                expect(response.resources[4]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.resources[5]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[2])}/endorsements/${endorserId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve endorsement on identity's claim", () => {
            it("should return success", async () => {
                const response = await platformClient.getIdentityClaimEndorsement(
                    identityId,
                    platformUtils.hash("sha256", claims[0]),
                    endorserId,
                    keyPair);
                expect(response.endorserId).to.equal(endorserId);
                expect(response.endorsement).to.equal(endorsements[platformUtils.hash("sha256", claims[0])]);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Endorse claims on unique asset type", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                endorsements = platformUtils.createEndorsementsObject(
                    uniqueAssetTypeId,
                    claims,
                    endorserKeyPair
                );
                const request: IEndorseClaimsRequest = {
                    _type: "CreateAssetTypeEndorsementsRequest",
                    endorserId: endorserId,
                    endorsements: endorsements,
                    requestId,
                    subjectId: uniqueAssetTypeId,
                }
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    endorserKeyPair
                );
                const response = await platformClient.endorseAssetTypeClaims(finalRequest, claims, endorserKeyPair);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(6);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}/endorsements/${endorserId}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[3]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}/endorsements/${endorserId}`);
                expect(response.resources[4]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.resources[5]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}/endorsements/${endorserId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve endorsement on unique asset type's claim", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetTypeClaimEndorsement(uniqueAssetTypeId, platformUtils.hash("sha256", claims[0]), endorserId, keyPair);
                expect(response.endorserId).to.equal(endorserId);
                expect(response.endorsement).to.equal(endorsements[platformUtils.hash("sha256", claims[0])]);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Endorse claims on quantifiable asset type", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                endorsements = platformUtils.createEndorsementsObject(
                    quantifiableAssetTypeId,
                    claims,
                    endorserKeyPair
                );
                const request: IEndorseClaimsRequest = {
                    _type: "CreateAssetTypeEndorsementsRequest",
                    endorserId: endorserId,
                    endorsements: endorsements,
                    requestId,
                    subjectId: quantifiableAssetTypeId,
                }
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    endorserKeyPair
                );                
                const response = await platformClient.endorseAssetTypeClaims(finalRequest, claims, endorserKeyPair);
                expect(response.resources.length).to.equal(6);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}/endorsements/${endorserId}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[3]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}/endorsements/${endorserId}`);
                expect(response.resources[4]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.resources[5]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}/endorsements/${endorserId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve endorsement on quantifiable asset type's claim", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetTypeClaimEndorsement(quantifiableAssetTypeId, platformUtils.hash("sha256", claims[0]), endorserId, keyPair);
                expect(response.endorserId).to.equal(endorserId);
                expect(response.endorsement).to.equal(endorsements[platformUtils.hash("sha256", claims[0])]);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Endorse claims on unique asset", () => {
            it("should return success", async () => {
                requestId = uuidv4();
                endorsements = platformUtils.createEndorsementsObject(
                    uniqueAssetId,
                    claims,
                    endorserKeyPair,
                    uniqueAssetTypeId
                );
                const request: IEndorseClaimsRequest = {
                    _type: "CreateAssetEndorsementsRequest",
                    endorserId: endorserId,
                    endorsements: endorsements,
                    requestId,
                    subjectId: uniqueAssetId,
                    subjectTypeId: uniqueAssetTypeId,
                }
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    endorserKeyPair
                );
                const response = await platformClient.endorseAssetClaims(finalRequest, claims, endorserKeyPair);
                expect(response.resources.length).to.equal(6);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[0])}/endorsements/${endorserId}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[3]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[1])}/endorsements/${endorserId}`);
                expect(response.resources[4]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.resources[5]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[2])}/endorsements/${endorserId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve endorsement on unique asset's claim", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetClaimEndorsement(uniqueAssetId, uniqueAssetTypeId, platformUtils.hash("sha256", claims[0]), endorserId, keyPair);
                expect(response.endorserId).to.equal(endorserId);
                expect(response.endorsement).to.equal(endorsements[platformUtils.hash("sha256", claims[0])]);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Endorse claims on account", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                endorsements = platformUtils.createEndorsementsObject(
                    accountId,
                    claims,
                    endorserKeyPair,
                    quantifiableAssetTypeId
                );
                const request: IEndorseClaimsRequest = {
                    _type: "CreateAssetEndorsementsRequest",
                    endorserId: endorserId,
                    endorsements: endorsements,
                    requestId,
                    subjectId: accountId,
                    subjectTypeId: quantifiableAssetTypeId,
                }
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    endorserKeyPair
                );
                const response = await platformClient.endorseAssetClaims(finalRequest, claims, endorserKeyPair);
                expect(response.resources.length).to.equal(6);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[0])}/endorsements/${endorserId}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[3]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[1])}/endorsements/${endorserId}`);
                expect(response.resources[4]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.resources[5]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[2])}/endorsements/${endorserId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve endorsement on account's claim", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetClaimEndorsement(accountId, quantifiableAssetTypeId, platformUtils.hash("sha256", claims[0]), endorserId, keyPair);
                expect(response.endorserId).to.equal(endorserId);
                expect(response.endorsement).to.equal(endorsements[platformUtils.hash("sha256", claims[0])]);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

    });
});
