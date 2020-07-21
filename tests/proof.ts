import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { ICreateIdentityRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl = "https://api.vienna-integration.poc.iov42.net";
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId: string;
let requestId: string;
let keyPair: IKeyPairData;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];

inputs.forEach(function(input) {
    describe(`Testing proof methods with protocolId="${input.protocolId}"`, function() {
        this.timeout(60000);

        before('Initializing identity', () => {
            identityId = uuidv4();
            requestId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
                requestId,
            };
            return platformClient.createIdentity(request, keyPair);

        });

        describe("Retrieve proof", function() {
            it("should return success", function() {
                return platformClient.getProof(requestId, keyPair)
                .then( (response) => {
                    expect(response.proof).exist;
                    expect(response.signatories).exist;
                    expect(response.parentFingerprints).exist;
                });

            });
        });

    });

});
