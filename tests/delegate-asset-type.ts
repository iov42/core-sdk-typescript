import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { ICreateAssetTypeRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType, IAuthorisedRequest, IAddDelegateRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId: string;
let delegateIdentityId: string;
let keyPair: IKeyPairData;
let delegateKeyPair: IKeyPairData;
let assetTypeId: string;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];

inputs.forEach(function(input) {

    describe(`Testing asset-type methods using delegate with protocolId="${input.protocolId}"`, function() {

        before('Initializing identities', function() {
            identityId = uuidv4();
            delegateIdentityId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);
            delegateKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, delegateIdentityId);
    
            const request1: ICreateIdentityRequest = {
                identityId,
                publicCredentials : {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request1, keyPair)
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

        });

        describe("Create asset-type using delegate", function() {
            it("should return success", function() {
                assetTypeId = uuidv4()
                const request: ICreateAssetTypeRequest = {
                    assetTypeId,
                    type: "Unique",
                    requestId: uuidv4(),
                }

                return platformClient.createAssetType(request, delegateKeyPair, identityId)
                .then( (response) => {
                    expect(response.requestId).to.equal(request.requestId);
                    expect(response.resources.length).to.equal(1);
                    expect(response.resources[0]).to.equal(`/api/v1/asset-types/${request.assetTypeId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);   
                })
            });

        });

        describe("Retrieve asset-type using delegate", function() {
            it("should return success", function() {
                return platformClient.getAssetType(assetTypeId, delegateKeyPair, identityId)
                .then( (response) => {
                    expect(response.assetTypeId).to.equal(assetTypeId);
                    expect(response.ownerId).to.equal(identityId);
                    expect(response.type).to.equal("Unique");
                })
            });
        });
    });

});
