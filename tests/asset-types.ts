import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType, ICreateAssetTypeRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

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

    describe(`Testing asset-type methods with protocolId="${input.protocolId}"`, function () {

        before('Initializing identities', () => {
            identityId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request, keyPair)
        });

        describe("Create new unique asset-type", () => {
            it("should return success", async () => {

                assetTypeId = uuidv4()
                requestId = uuidv4()
                const request: ICreateAssetTypeRequest = {
                    assetTypeId,
                    type: "Unique",
                    requestId,
                }

                const response = await platformClient.createAssetType(request, keyPair);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(1);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

        describe("Retrieve created asset-type", () => {
            it("should return success", async () => {
                const response = await platformClient.getAssetType(assetTypeId, keyPair);
                expect(response.assetTypeId).to.equal(assetTypeId);
                expect(response.ownerId).to.equal(identityId);
                expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
                expect(response.type).to.equal("Unique");
            });
        });

        describe("Create new quantifiable asset-type", () => {
            it("should return success", async () => {

                const request: ICreateAssetTypeRequest = {
                    assetTypeId: uuidv4(),
                    scale:  2,
                    type: "Quantifiable",
                    requestId: uuidv4(),
                }

                const response = await platformClient.createAssetType(request, keyPair);
                expect(response.requestId).to.equal(request.requestId);
                expect(response.resources.length).to.equal(1);
                expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}`);
                expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
            });
        });

    });
});
