#!/usr/bin/env node
import 'source-map-support/register'
import { App } from '@aws-cdk/core'
import { LambdaStack } from '../lib/lambdaStack'

new LambdaStack(new App(), 'LambdaStack')
