import { buildScenarios } from './scenarios.mjs';
console.log(JSON.stringify({kind:'synthetic_workflow_examples',scenarios:buildScenarios()},null,2));
