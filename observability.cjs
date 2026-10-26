require('@aws/aws-distro-opentelemetry-node-autoinstrumentation/register')
process.env.OTEL_TRACES_EXPORTER = 'none'
