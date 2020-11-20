import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { ICreateIdentityRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
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
    describe(`Testing request methods with protocolId="${input.protocolId}"`, function() {
        this.timeout(60000);

        before('Initializing identities, asset types', () => {
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

        describe("Retrieve request", function() {
            it("should return success", function() {
                return platformClient.getRequest(requestId)
                .then( (response) => {
                    expect(response.requestId).to.equal(requestId);
                    expect(response.resources[0]).to.equal(`/api/v1/identities/${identityId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
                });

            });
        });

    });

});
