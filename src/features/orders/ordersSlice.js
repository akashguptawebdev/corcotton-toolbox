import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordersApi } from './orders.api';

// Real backend-backed — no mock data. `filters.status` may hold a single ORDER_STATUS
// value or the special 'EXCEPTIONS' token, which the thunk below expands to "NDR,RTO"
// (backend/src/constants/orderEnums.js) for the exceptions queue (brief §6).
const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  filters: {
    search: '',
    status: 'all',
    paymentMethod: 'all',
  },
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  orders: [],
  summary: {
    cards: { total: 0, pendingShipment: 0, inTransit: 0, actionRequired: 0, delivered: 0 },
    cod: { outstanding: 0, collected: 0 },
    ndrReasons: [],
  },
  summaryStatus: 'idle',
  selectedOrder: null,
  selectedOrderId: null,
  selectedOrderStatus: 'idle',
  actionStatus: 'idle', // ship/cancel in-flight state for the detail view
  actionError: null,
};

const statusParam = (status) => (status === 'EXCEPTIONS' ? 'NDR,RTO' : status === 'all' ? undefined : status);

export const fetchOrders = createAsyncThunk('orders/fetch', async (_, { getState, rejectWithValue }) => {
  const { filters, pagination } = getState().orders;
  try {
    return await ordersApi.list({
      status: statusParam(filters.status),
      paymentMethod: filters.paymentMethod === 'all' ? undefined : filters.paymentMethod,
      search: filters.search || undefined,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to load orders');
  }
});

export const fetchOrderSummary = createAsyncThunk('orders/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    return await ordersApi.summary();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to load order summary');
  }
});

export const fetchOrderDetail = createAsyncThunk('orders/fetchDetail', async (id, { rejectWithValue }) => {
  try {
    return await ordersApi.get(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to load order');
  }
});

// Refetches the list + summary after a write so every card/row reflects the new state,
// rather than hand-patching redux and risking it drifting from the server.
export const shipOrder = createAsyncThunk('orders/ship', async (id, { dispatch, rejectWithValue }) => {
  try {
    const result = await ordersApi.ship(id);
    await Promise.all([dispatch(fetchOrders()), dispatch(fetchOrderSummary()), dispatch(fetchOrderDetail(id))]);
    return result;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to create shipment');
  }
});

export const cancelOrder = createAsyncThunk('orders/cancel', async ({ id, reason }, { dispatch, rejectWithValue }) => {
  try {
    const result = await ordersApi.cancel(id, reason);
    await Promise.all([dispatch(fetchOrders()), dispatch(fetchOrderSummary()), dispatch(fetchOrderDetail(id))]);
    return result;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to cancel order');
  }
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrderFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setOrdersPage(state, action) {
      state.pagination.page = action.payload;
    },
    selectOrder(state, action) {
      state.selectedOrder = null;
      state.selectedOrderId = action.payload;
    },
    clearSelectedOrder(state) {
      state.selectedOrder = null;
      state.selectedOrderId = null;
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.orders = action.payload.orders;
        state.pagination = { ...state.pagination, ...action.payload.pagination };
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchOrderSummary.pending, (state) => {
        state.summaryStatus = 'loading';
      })
      .addCase(fetchOrderSummary.fulfilled, (state, action) => {
        state.summaryStatus = 'succeeded';
        state.summary = action.payload;
      })
      .addCase(fetchOrderSummary.rejected, (state) => {
        state.summaryStatus = 'failed';
      })
      .addCase(fetchOrderDetail.pending, (state) => {
        state.selectedOrderStatus = 'loading';
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.selectedOrderStatus = 'succeeded';
        state.selectedOrder = action.payload.order;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.selectedOrderStatus = 'failed';
        state.error = action.payload;
      })
      .addCase(shipOrder.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(shipOrder.fulfilled, (state) => {
        state.actionStatus = 'succeeded';
      })
      .addCase(shipOrder.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })
      .addCase(cancelOrder.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(cancelOrder.fulfilled, (state) => {
        state.actionStatus = 'succeeded';
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      });
  },
});

export const { setOrderFilters, setOrdersPage, selectOrder, clearSelectedOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
