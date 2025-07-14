import * as ActionModule from '../actions/action'
import { combineReducers } from "redux";
const { ActionTypes, initialStates } = ActionModule; 

const companyReducer = (state = initialStates.companyState, action) => {
  switch (action.type) {
    case ActionTypes.FETCH_COMPANY_SUCCESS:
      return {
        ...state,
        data: action.payload,
      };
    case ActionTypes.FETCH_COMPANY_FAILURE:
      return {
        ...state,
        error: action.payload,
      };
    case ActionTypes.SET_ALLOWED_CATEGORIES:
      return {
        ...state,
        allowedCategories: action.payload,
      };
    case ActionTypes.SET_ALLOWED_UNITS:
      return {
        ...state,
        allowedUnits: action.payload,
      };
    case ActionTypes.ADD_ALLOWED_CATEGORY:
      return {
        ...state,
        allowedCategories: [...(state.allowedCategories || []), action.payload],
      };
    case ActionTypes.ADD_ALLOWED_UNIT:
      return {
        ...state,
        allowedUnits: [...(state.allowedUnits || []), action.payload],
      };
    case ActionTypes.REMOVE_ALLOWED_CATEGORY:
      return {
        ...state,
        allowedCategories: state.allowedCategories.filter(
          (category) => category !== action.payload
        ),
      };
    case ActionTypes.REMOVE_ALLOWED_UNIT:
      return {
        ...state,
        allowedUnits: state.allowedUnits.filter(
          (unit) => unit !== action.payload
        ),
      };
    case ActionTypes.LOGIN:
      return {
        ...state,
        isLoggedIn: true,
      };
    case ActionTypes.LOGOUT:
      return initialStates.companyState;
    default:
      return state;
  }
};

const productsReducer = (state = initialStates.productState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_PRODUCT:
      return {
        ...state,
        numProducts: state.numProducts + 1,
      };
    case ActionTypes.REMOVE_PRODUCT:
      if (state.numProducts > 1) {
        return {
          ...state,
          numProducts: state.numProducts - 1,
        };
      } else {
        return state;
      }
    default:
      return state;
  }
};

const cartReducer = (state = initialStates.cartState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_TO_CART:
      return {
        ...state,
        cart: [...state.cart, action.payload],
      };
    case ActionTypes.REMOVE_FROM_CART:
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload),
      };
    case ActionTypes.COMPLETE_TRANSACTION:
      return {
        ...state,
        transactionComplete: true,
      };
    default:
      return state;
  }
};

const customersReducer = (state = initialStates.customerState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_CUSTOMER:
      return {
        ...state,
        numCustomers: state.numCustomers + 1,
      };
    case ActionTypes.REMOVE_CUSTOMER:
      if (state.numCustomers > 1) {
        return {
          ...state,
          numCustomers: state.numCustomers - 1,
        };
      } else {
        return state;
      }
    default:
      return state;
  }
};

const authReducer = (state = initialStates.authState, action) => {
  switch (action.type) {
    case ActionTypes.SET_AUTH_TOKEN:
      return {
        ...state,
        authToken: action.payload,
      };
    default:
      return state;
  }
};

const usersReducer = (state = initialStates.userState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_USER:
      return {
        ...state,
        users: [...state.users, action.payload],
      };
    case ActionTypes.REMOVE_USER:
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      };
    case ActionTypes.FETCH_USERS_SUCCESS:
      return {
        ...state,
        isLoading: false,
        users: action.payload,
      };
    case ActionTypes.FETCH_USERS_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case ActionTypes.FETCH_USERS_REQUEST:
      return {
        ...state,
        isLoading: true,
      };
    case ActionTypes.SET_CURRENT_USER:
      return {
        ...state,
        currentUser: action.payload,
      };
    case ActionTypes.SET_USER_TOKEN:
      return {
        ...state,
        token: action.payload,
      };
    default:
      return state;
  }
};

const receiptsReducer = (state = initialStates.receiptState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_RECEIPT:
      return {
        ...state,
        receipts: [...state.receipts, action.payload],
      };
    default:
      return state;
  }
};

const createResettableReducer = (reducer, initialState) => (state, action) => {
  if (action.type === ActionTypes.LOGOUT) {
    return initialState;
  }
  return reducer(state, action);
};

const rootReducer = combineReducers({
  companyState: createResettableReducer(
    companyReducer,
    initialStates.companyState
  ),
  productState: createResettableReducer(
    productsReducer,
    initialStates.productState
  ),
  cartState: createResettableReducer(cartReducer, initialStates.cartState),
  customerState: createResettableReducer(
    customersReducer,
    initialStates.customerState
  ),
  authState: createResettableReducer(authReducer, initialStates.authState),
  userState: createResettableReducer(usersReducer, initialStates.userState),
  receiptState: createResettableReducer(
    receiptsReducer,
    initialStates.receiptState
  ),
});

const rootReducerWithReset = (state, action) => {
  if (action.type === ActionTypes.LOGOUT) {
    state = undefined;
  }
  return rootReducer(state, action);
};

export default rootReducerWithReset;
