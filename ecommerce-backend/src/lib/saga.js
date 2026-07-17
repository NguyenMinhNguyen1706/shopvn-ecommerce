const { Logger } = require('../config/logger');

const logger = new Logger({ component: 'SagaOrchestrator' }, process.env.LOG_LEVEL || 'info');

/**
 * Saga Orchestrator for Checkout Flow (Distributed Transactions)
 * Concepts: Distributed Transactions, Saga Pattern, Eventual Consistency
 * Manages multi-step business transactions with compensating actions.
 */
class Saga {
  constructor(name) {
    this.name = name;
    this.steps = [];
  }

  /**
   * Add step to Saga
   * @param {string} name - Step name
   * @param {Function} action - Async function `() => Promise<any>`
   * @param {Function} compensate - Async function to undo the step if subsequent steps fail
   */
  addStep(name, action, compensate) {
    this.steps.push({ name, action, compensate });
    return this;
  }

  /**
   * Execute the Saga transaction flow
   */
  async execute() {
    const executedSteps = [];
    logger.info({ sagaName: this.name }, `Starting Saga execution`);

    for (const step of this.steps) {
      try {
        logger.info({ sagaName: this.name, step: step.name }, `Executing step`);
        const result = await step.action();
        executedSteps.push({ step, result });
      } catch (err) {
        logger.error(
          { sagaName: this.name, step: step.name, err: err.message },
          `Step execution failed. Starting compensation.`
        );
        await this._compensate(executedSteps);
        throw err; // propagate the error to caller
      }
    }

    logger.info({ sagaName: this.name }, `Saga completed successfully`);
    return executedSteps.map(s => s.result);
  }

  /**
   * Run compensating actions in reverse order of execution
   */
  async _compensate(executedSteps) {
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const { step, result } = executedSteps[i];
      if (step.compensate) {
        try {
          logger.warn({ sagaName: this.name, step: step.name }, `Compensating step`);
          await step.compensate(result);
        } catch (compErr) {
          logger.fatal(
            { sagaName: this.name, step: step.name, err: compErr.message },
            `Compensation step FAILED! Requires manual intervention.`
          );
        }
      }
    }
  }
}

module.exports = { Saga };
