const dbUtils = require('../utils/dbUtils');
const { hasFeature, getLimit } = require('../config/plans');

/**
 * Extract companyId from request — checks user token, body, and params.
 */
const getCompanyId = (req) => {
  return req.user?.companyId || req.user?.id || req.body?.companyId || req.params?.companyId || req.params?.id;
};

/**
 * Middleware that checks if the company's plan includes a required feature.
 * Returns 403 if the feature is not available on the current plan.
 */
const requireFeature = (featureKey) => async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return next();

    const company = await dbUtils.dbGet(
      'SELECT currentPlan FROM Company WHERE id = ?',
      [companyId]
    );
    const plan = company?.currentPlan || 'STARTER';

    if (!hasFeature(plan, featureKey)) {
      return res.status(403).json({
        error: 'This feature requires a plan upgrade.',
        requiredFeature: featureKey,
        currentPlan: plan,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware that enforces a numeric plan limit (e.g. max products, staff).
 * Counts rows in the given table and compares against the plan limit.
 *
 * @param {string} limitKey - Key in plan.limits (e.g. 'staff', 'products')
 * @param {string} tableName - DB table to count
 * @param {string} [whereClause='companyId = ?'] - WHERE clause (must have exactly one ? for companyId)
 */
const enforceLimit = (limitKey, tableName, whereClause = 'companyId = ?') => async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return next();

    const company = await dbUtils.dbGet(
      'SELECT currentPlan FROM Company WHERE id = ?',
      [companyId]
    );
    const plan = company?.currentPlan || 'STARTER';
    const limit = getLimit(plan, limitKey);

    const row = await dbUtils.dbGet(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
      [companyId]
    );

    if (row.count >= limit) {
      return res.status(403).json({
        error: `Plan limit reached. Your ${plan} plan allows ${limit} ${limitKey}.`,
        limit,
        current: row.count,
        currentPlan: plan,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireFeature, enforceLimit };
