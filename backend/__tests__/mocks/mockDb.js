const mockDb = {
  prepare: jest.fn(),
  run: jest.fn(),
  serialize: jest.fn((cb) => cb && cb()),
  get: jest.fn(),
  all: jest.fn(),
};

const mockStatement = {
  run: jest.fn(function() { return { lastID: 1, changes: 1 }; }),
  get: jest.fn(),
  all: jest.fn(),
};

// Default behavior: prepare returns a mock statement
mockDb.prepare.mockReturnValue(mockStatement);

module.exports = { mockDb, mockStatement };
