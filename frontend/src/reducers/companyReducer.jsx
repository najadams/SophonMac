// import { ActionTypes } from "../actions/action.js";
import { ActionTypes } from "../actions/action";

const initialState = {
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
};

const companyReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.SET_RECEIPT_TEMPLATE:
      return {
        ...state,
        data: {
          ...state.data,
          receiptTemplate: action.payload,
        },
      };

    case ActionTypes.FETCH_COMPANY_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case ActionTypes.FETCH_COMPANY_SUCCESS:
      return {
        ...state,
        data: {
          ...state.data,
          ...action.payload,
        },
        loading: false,
        error: null,
      };

    case ActionTypes.FETCH_COMPANY_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default companyReducer;
