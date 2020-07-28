import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformClient, ProtocolIdType, IAuthorisedRequest, ICreateAssetTypeRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl = "https://api.sandbox.iov42.dev";
const platformClient = new PlatformClient(rpcUrl);

let identityId: string;
let assetTypeId: string;
let requestId: string
let keyPair: IKeyPairData;


const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];


inputs.forEach(input => {

    describe(`Testing create asset-type methods with protocolId=${input.protocolId}`, function () {
        this.timeout(20000);

        before('Initializing identities', () => {
            identityId = uuidv4();
            keyPair = platformClient.generateKeypairWithProtocolId(input.protocolId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request, keyPair)
        });

        describe("Create new asset-type", () => {
            it("should return success", async () => {

                assetTypeId = uuidv4()
                requestId = uuidv4()
                const request: ICreateAssetTypeRequest = {
                    assetTypeId,
                    type: "Unique",
                    requestId,
                }

                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(identityId, request, keyPair);

                const response = await platformClient.createAssetType(identityId, signedRequest, keyPair);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(1);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve created asset-type", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetType(identityId, assetTypeId, keyPair);
                expect(response.assetTypeId).to.equal(assetTypeId);
                expect(response.ownerId).to.equal(identityId);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
            });
        });
    });
});
