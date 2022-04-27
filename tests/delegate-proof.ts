import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IAddDelegateRequest, IAuthorisedRequest, ICreateIdentityRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId: string;
let delegateIdentityId: string;
let requestId: string;
let keyPair: IKeyPairData;
let delegateKeyPair: IKeyPairData;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];

inputs.forEach(function(input) {
    describe(`Testing proof methods using delegate with protocolId="${input.protocolId}"`, function() {

        before('Initializing identities', () => {
            identityId = uuidv4();
            delegateIdentityId = uuidv4();
            requestId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);
            delegateKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, delegateIdentityId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
                requestId,
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

        });

        describe("Retrieve proof", function() {
            it("should return success", function() {
                return platformClient.getProof(requestId, delegateKeyPair, identityId)
                .then( (response) => {
                    expect(response.proof).exist;
                    expect(response.signatories).exist;
                    expect(response.parentFingerprints).exist;
                });

            });
        });

    });

});
