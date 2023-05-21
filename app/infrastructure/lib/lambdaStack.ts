import {Construct, Duration, RemovalPolicy, Stack, StackProps} from '@aws-cdk/core'
import {Code, Function, Runtime} from '@aws-cdk/aws-lambda'
import {RetentionDays} from '@aws-cdk/aws-logs'
import {Rule, Schedule} from '@aws-cdk/aws-events'
import {LambdaFunction} from '@aws-cdk/aws-events-targets'
import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import {Effect} from "@aws-cdk/aws-iam";
import {BlockPublicAccess} from "@aws-cdk/aws-s3";

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const s3Bucket = new s3.Bucket(this, 'AqueductJupiterData', {
      bucketName: 'aqueduct-jupiter-tx-data',
      publicReadAccess: false,
      enforceSSL: true,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN
    });

    const jupiterDataLambda = new Function(this, 'JupiterData', {
      functionName: 'JupiterData',
      description: '',
      runtime: Runtime.NODEJS_16_X,
      handler: 'lambda.jupDataHandler',
      code: Code.fromAsset('../dist/lambda.zip'),
      memorySize: 2048,
      timeout: Duration.seconds(5 * 60),
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      reservedConcurrentExecutions: 1,
    })

    new Rule(this, 'JupiterDataTriggerSchedule', {
      description: 'Triggers the JupiterData lambda function every 10 minutes',
      schedule: Schedule.rate(Duration.minutes(5)),
      targets: [new LambdaFunction(jupiterDataLambda)],
    })

    const databaseLoaderLambda = new Function(this, 'DatabaseLoader', {
      functionName: 'DatabaseLoader',
      description: '',
      runtime: Runtime.NODEJS_16_X,
      handler: 'lambda.databaseLoaderHandler',
      code: Code.fromAsset('../dist/lambda.zip'),
      memorySize: 2048,
      timeout: Duration.seconds(5 * 60),
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      reservedConcurrentExecutions: 1
    })

    new Rule(this, 'DatabaseLoaderTriggerSchedule', {
      description: 'Triggers the DatabaseLoader lambda function every 10 minutes',
      schedule: Schedule.rate(Duration.minutes(5)),
      targets: [new LambdaFunction(databaseLoaderLambda)],
    })

    const positionsLambda = new Function(this, 'Positions', {
      functionName: 'Positions',
      description: '',
      runtime: Runtime.NODEJS_16_X,
      handler: 'lambda.positionsHandler',
      code: Code.fromAsset('../dist/lambda.zip'),
      memorySize: 2048,
      timeout: Duration.seconds(15 * 60),
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      reservedConcurrentExecutions: 1
    })

    new Rule(this, 'PositionsTriggerSchedule', {
      description: 'Triggers the Positions lambda function every 6 hours',
      schedule: Schedule.rate(Duration.minutes(60 * 6)),
      targets: [new LambdaFunction(positionsLambda)],
    })

    const lambdas = [
      jupiterDataLambda,
      databaseLoaderLambda,
      positionsLambda
    ]

    const s3Policy = new iam.PolicyStatement({
      actions: ['s3:*'],
      effect: Effect.ALLOW,
      resources: ["*"],
    });

    const sqsPolicy = new iam.PolicyStatement({
      actions: ['sqs:*'],
      effect: Effect.ALLOW,
      resources: ["*"],
    });

    for (const lambda of lambdas){
      lambda.role?.attachInlinePolicy(
          new iam.Policy(this, `${lambda.node.id.toLowerCase()}-s3-policy`, {
            statements: [s3Policy],
          }),
      );

      lambda.role?.attachInlinePolicy(
          new iam.Policy(this, `${lambda.node.id.toLowerCase()}-sqs-policy`, {
            statements: [sqsPolicy],
          }),
      );
    }

  }
}
