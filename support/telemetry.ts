import { Sha256 } from '@aws-crypto/sha256-js'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { context, propagation } from '@opentelemetry/api'
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer'
import { envDetector, resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'
import { signedAwsFetch } from './aws.js'

const http = new NodeHttpHandler()
export const tracedRequestHandler = {
  handle: (request: HttpRequest, options?: Parameters<NodeHttpHandler['handle']>[1]) => {
    propagation.inject(context.active(), request.headers)
    return http.handle(request, options)
  },
}

export function setupTelemetry({ region, serviceName }: { region: string; serviceName: string }) {
  const signer = new SignatureV4({
    service: 'xray', region, sha256: Sha256, credentials: fromNodeProviderChain(),
  })
  const telemetry = new NodeTracerProvider({
    resource: resourceFromAttributes({
      ...envDetector.detect().attributes,
      'service.name': serviceName,
      'deployment.environment.name': 'haunted-demo',
    }),
    spanProcessors: [new BatchSpanProcessor({
      export: (spans, done) => {
        void signedAwsFetch(signer, `https://xray.${region}.amazonaws.com/v1/traces`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' },
          body: Buffer.from(ProtobufTraceSerializer.serializeRequest(spans)!),
        }).then(async response => {
          if (!response.ok) throw new Error(`Trace export: ${response.status} ${await response.text()}`)
          for (const span of spans.filter(span => span.name === 'invoke_agent haunted-investigator')) {
            console.log(JSON.stringify({
              incident_id: span.attributes['incident.id'], stage: 'trace_exported', trace_id: span.spanContext().traceId,
            }))
          }
          done({ code: 0 })
        }).catch(error => { console.error(error); done({ code: 1, error }) })
      },
      shutdown: async () => {},
    })],
  })
  telemetry.register()
  return telemetry
}
