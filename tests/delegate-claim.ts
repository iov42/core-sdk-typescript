import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IAddDelegateRequest, IAuthorisedRequest, ICreateClaimsRequest, IKeyPairData, PlatformClient, ProtocolIdType, PlatformUtils, ICreateAssetRequest, ICreateAssetTypeRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

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

    describe(`Testing claim methods using delegate with protocolId="${input.protocolId}"`, function () {

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
            .then(() => {
                const request2: ICreateIdentityRequest = {
                    identityId: delegateIdentityId,
                    publicCredentials : {
                        key: delegateKeyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request2, delegateKeyPair);
            })
            .then(() => {
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

        describe("Create claims on identity", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                const request: ICreateClaimsRequest = {
                    claims: platformUtils.createClaimsHashArray(claims),
                    requestId,
                    subjectId: identityId,
                }
                const response = await platformClient.createIdentityClaims(request, claims, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(claims.length);
                expect(response.resources[0]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[2]).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve claims on identity", () => {
            it("should return success", async () => {
                const response = await platformClient.getIdentityClaims(identityId, delegateKeyPair, identityId);
                expect(response.claims.length).to.equal(claims.length);

                const pos0 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].resource).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.claims[pos0].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos1 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].claim).to.equal(platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].resource).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.claims[pos1].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos2 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].claim).to.equal(platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].resource).to.equal(`/api/v1/identities/${identityId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.claims[pos2].proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Retrieve claim on identity", () => {
            it("should return success", async () => {
                const response = await platformClient.getIdentityClaim(identityId, platformUtils.hash("sha256", claims[0]), delegateKeyPair, identityId);
                expect(response.claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.endorsements.length).to.equal(0);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Create claims on unique asset type", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                const request: ICreateClaimsRequest = {
                    claims: platformUtils.createClaimsHashArray(claims),
                    requestId,
                    subjectId: uniqueAssetTypeId,
                }
                const response = await platformClient.createAssetTypeClaims(request, claims, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(claims.length);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve claims on unique asset type", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetTypeClaims(uniqueAssetTypeId, delegateKeyPair, identityId);
                expect(response.claims.length).to.equal(claims.length);

                const pos0 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].resource).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.claims[pos0].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos1 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].claim).to.equal(platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].resource).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.claims[pos1].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos2 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].claim).to.equal(platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].resource).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.claims[pos2].proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Retrieve claim on unique asset type", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetTypeClaim(uniqueAssetTypeId, platformUtils.hash("sha256", claims[0]), delegateKeyPair, identityId);
                expect(response.claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.endorsements.length).to.equal(0);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Create claims on quantifiable asset type", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                const request: ICreateClaimsRequest = {
                    claims: platformUtils.createClaimsHashArray(claims),
                    requestId,
                    subjectId: quantifiableAssetTypeId,
                }
                const response = await platformClient.createAssetTypeClaims(request, claims, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(claims.length);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve claims on quantifiable asset type", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetTypeClaims(quantifiableAssetTypeId, delegateKeyPair, identityId);
                expect(response.claims.length).to.equal(claims.length);

                const pos0 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].resource).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.claims[pos0].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos1 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].claim).to.equal(platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].resource).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.claims[pos1].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos2 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].claim).to.equal(platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].resource).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.claims[pos2].proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Retrieve claim on quantifiable asset type", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetTypeClaim(quantifiableAssetTypeId, platformUtils.hash("sha256", claims[0]), delegateKeyPair, identityId);
                expect(response.claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.endorsements.length).to.equal(0);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Create claims on unique asset", () => {
            it("should return success", async () => {
                requestId = uuidv4();
                const request: ICreateClaimsRequest = {
                    claims: platformUtils.createClaimsHashArray(claims),
                    requestId,
                    subjectId: uniqueAssetId,
                    subjectTypeId: uniqueAssetTypeId,
                }
                const response = await platformClient.createAssetClaims(request, claims, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(claims.length);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve claims on unique asset", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetClaims(uniqueAssetId, uniqueAssetTypeId, delegateKeyPair, identityId);
                expect(response.claims.length).to.equal(claims.length);

                const pos0 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].resource).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.claims[pos0].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos1 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].claim).to.equal(platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].resource).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.claims[pos1].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos2 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].claim).to.equal(platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].resource).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.claims[pos2].proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Retrieve claim on unique asset", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetClaim(uniqueAssetId, uniqueAssetTypeId, platformUtils.hash("sha256", claims[0]), delegateKeyPair, identityId);
                expect(response.claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.endorsements.length).to.equal(0);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Create claims on account", () => {
            it("should return success", async () => {
                requestId = uuidv4()
                const request: ICreateClaimsRequest = {
                    claims: platformUtils.createClaimsHashArray(claims),
                    requestId,
                    subjectId: accountId,
                    subjectTypeId: quantifiableAssetTypeId,
                }
                const response = await platformClient.createAssetClaims(request, claims, delegateKeyPair, identityId);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(claims.length);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.resources[1]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.resources[2]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve claims on account", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetClaims(accountId, quantifiableAssetTypeId, delegateKeyPair, identityId);
                expect(response.claims.length).to.equal(claims.length);

                const pos0 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.claims[pos0].resource).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[0])}`);
                expect(response.claims[pos0].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos1 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].claim).to.equal(platformUtils.hash("sha256", claims[1]));
                expect(response.claims[pos1].resource).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[1])}`);
                expect(response.claims[pos1].proof).to.equal(`/api/v1/proofs/${requestId}`);

                const pos2 = response.claims.findIndex((x: any) => x.claim === platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].claim).to.equal(platformUtils.hash("sha256", claims[2]));
                expect(response.claims[pos2].resource).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId}/claims/${platformUtils.hash("sha256", claims[2])}`);
                expect(response.claims[pos2].proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

        describe("Retrieve claim on account", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetClaim(accountId, quantifiableAssetTypeId, platformUtils.hash("sha256", claims[0]), delegateKeyPair, identityId);
                expect(response.claim).to.equal(platformUtils.hash("sha256", claims[0]));
                expect(response.endorsements.length).to.equal(0);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });

    });
});
