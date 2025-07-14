export const ActionTypes = {
  FETCH_COMPANY_SUCCESS: "FETCH_COMPANY_SUCCESS",
  FETCH_COMPANY_FAILURE: "FETCH_COMPANY_FAILURE",
  ADD_PRODUCT: "ADD_PRODUCT",
  FETCH_INVENTORY_SUCCESS: "FETCH_INVENTORY_SUCCESS",
  FETCH_INVENTORY_REQUEST: "FETCH_INVENTORY_REQUEST",
  FETCH_INVENTORY_FAILURE: "FETCH_INVENTORY_FAILURE",
  REMOVE_PRODUCT: "REMOVE_PRODUCT",
  ADD_TO_CART: "ADD_TO_CART",
  REMOVE_FROM_CART: "REMOVE_FROM_CART",
  COMPLETE_TRANSACTION: "COMPLETE_TRANSACTION",

  SET_CURRENT_USER: "SET_CURRENT_USER",
  SET_USER_TOKEN: "SET_USER_TOKEN",
  ADD_RECEIPT: "ADD_RECEIPT",

  SET_AUTH_TOKEN: "SET_AUTH_TOKEN",
  FETCH_USERS_REQUEST: "FETCH_USERS_REQUEST",
  FETCH_USERS_SUCCESS: "FETCH_USERS_SUCCESS",
  FETCH_USERS_FAILURE: "FETCH_USERS_FAILURE",
  ADD_USER: "ADD_USER",
  REMOVE_USER: "REMOVE_USER",

  ADD_CUSTOMER: "ADD_CUSTOMER",
  REMOVE_CUSTOMER: "REMOVE_CUSTOMER",

  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",

  SET_ALLOWED_CATEGORIES: "SET_ALLOWED_CATEGORIES",
  SET_ALLOWED_UNITS: "SET_ALLOWED_UNITS",

  ADD_ALLOWED_CATEGORY: "ADD_ALLOWED_CATEGORY",
  ADD_ALLOWED_UNIT: "ADD_ALLOWED_UNIT",
  REMOVE_ALLOWED_CATEGORY: "REMOVE_ALLOWED_CATEGORY",
  REMOVE_ALLOWED_UNIT: "REMOVE_ALLOWED_UNIT",

  SET_RECEIPT_TEMPLATE: "SET_RECEIPT_TEMPLATE",
};

export const initialStates = {
  companyState: {
    data: {
      id: null,
      companyName: "",
      email: "",
      contact: "",
      location: "",
      momo: "",
      taxRate: 0,
      receiptTemplate: "template1",
      receiptHeader: "",
      receiptFooter: "",
    },
    isLoggedIn: false,
    error: null,
    allowedCategories: [],
    allowedUnits: [],
  },
  productState: {
    numProducts: 0,
    isLoading: true, // Loading state for products
    error: null, // Error state for products
  },
  customerState: {
    numCustomers: 0,
    isLoading: false, // Loading state for users
    error: null, // Error state for users
  },
  cartState: {
    cart: [],
    transactionComplete: false, // Transaction status
    isLoading: false, // Loading state for cart
    error: null, // Error state for cart
  },
  userState: {
    numUsers: 0,
    token: null, // Authentication token for dem
    currentUser: null, // Current logged in user
    isLoading: false, // Loading state for users
    error: null, // Error state for users
  },
  receiptState: {
    receipts: [],
    isLoading: false, // Loading state for receipts
    error: null, // Error state for receipts
  },
  authState: {
    authToken: null, // Authentication token
    isLoading: false, // Loading state for authentication
    error: null, // Error state for authentication
  },
};

export const ActionCreators = {
  loginCompany: () => ({
    type: ActionTypes.LOGIN,
  }),
  logoutCompany: () => ({
    type: ActionTypes.LOGOUT,
  }),
  fetchCompanySuccess: (data) => ({
    type: ActionTypes.FETCH_COMPANY_SUCCESS,
    payload: data,
  }),
  setUserToken: (token) => ({
    type: ActionTypes.SET_USER_TOKEN,
    payload: token,
  }),
  fetchCompanyFailure: () => ({
    type: ActionTypes.FETCH_COMPANY_FAILURE,
  }),
  fetchUserRequest: () => ({
    type: ActionTypes.FETCH_USERS_REQUEST,
  }),
  fetchUserSuccess: (users) => ({
    type: ActionTypes.FETCH_USERS_SUCCESS,
    payload: users,
  }),
  fetchUserFailure: (error) => ({
    type: ActionTypes.FETCH_USERS_FAILURE,
    payload: error,
  }),
  fetchInventorySuccess: (inventory) => ({
    type: ActionTypes.FETCH_INVENTORY_SUCCESS,
    payload: inventory,
  }),
  fetchInventoryFailure: (error) => ({
    type: ActionTypes.FETCH_INVENTORY_FAILURE,
    payload: error,
  }),

  addProduct: () => ({
    type: ActionTypes.ADD_PRODUCT,
  }),
  removeProduct: () => ({
    type: ActionTypes.REMOVE_PRODUCT,
  }),
  addCustomer: () => ({
    type: ActionTypes.ADD_CUSTOMER,
  }),
  removeCustomer: () => ({
    type: ActionTypes.REMOVE_CUSTOMER,
  }),
  addToCart: (item) => ({
    type: ActionTypes.ADD_TO_CART,
    payload: item,
  }),
  removeFromCart: (itemId) => ({
    type: ActionTypes.REMOVE_FROM_CART,
    payload: itemId,
  }),
  completeTransaction: (transaction) => ({
    type: ActionTypes.COMPLETE_TRANSACTION,
    payload: transaction,
  }),
  addUser: (user) => ({
    type: ActionTypes.ADD_USER,
    payload: user,
  }),
  removeUser: (userId) => ({
    type: ActionTypes.REMOVE_USER,
    payload: userId,
  }),
  setCurrentUser: (user) => ({
    type: ActionTypes.SET_CURRENT_USER,
    payload: user,
  }),
  addReceipt: (receipt) => ({
    type: ActionTypes.ADD_RECEIPT,
    payload: receipt,
  }),
  setAuthToken: (token) => ({
    type: ActionTypes.SET_AUTH_TOKEN,
    payload: token,
  }),
  setAllowedCategories: (categories) => ({
    type: ActionTypes.SET_ALLOWED_CATEGORIES,
    payload: categories,
  }),
  setAllowedUnits: (units) => ({
    type: ActionTypes.SET_ALLOWED_UNITS,
    payload: units,
  }),
  addAllowedCategory: (category) => ({
    type: ActionTypes.ADD_ALLOWED_CATEGORY,
    payload: category,
  }),
  addAllowedUnit: (unit) => ({
    type: ActionTypes.ADD_ALLOWED_UNIT,
    payload: unit,
  }),
  removeAllowedCategory: (category) => ({
    type: ActionTypes.REMOVE_ALLOWED_CATEGORY,
    payload: category,
  }),
  removeAllowedUnit: (unit) => ({
    type: ActionTypes.REMOVE_ALLOWED_UNIT,
    payload: unit,
  }),
  setReceiptTemplate: (template) => ({
    type: ActionTypes.SET_RECEIPT_TEMPLATE,
    payload: template,
  }),
};
