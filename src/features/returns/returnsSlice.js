import { createSlice } from '@reduxjs/toolkit';

const returnRows = [
  {
    id: 'R2086',
    orderId: '10642',
    customer: { name: 'Olivia Bennett', email: 'olivia.bennett@example.com' },
    date: 'Jan 21, 2025',
    time: '10:22 AM',
    items: 2,
    reason: 'wrong_size',
    refund: 49.99,
    status: 'pending_review',
    resolution: 'refund',
  },
  {
    id: 'R2085',
    orderId: '10641',
    customer: { name: 'Liam Carter', email: 'liam.carter@example.com' },
    date: 'Jan 21, 2025',
    time: '8:45 AM',
    items: 1,
    reason: 'damaged_item',
    refund: 39.49,
    status: 'pending_review',
    resolution: 'exchange',
  },
  {
    id: 'R2084',
    orderId: '10639',
    customer: { name: 'Emma Johnson', email: 'emma.johnson@example.com' },
    date: 'Jan 20, 2025',
    time: '8:15 PM',
    items: 1,
    reason: 'changed_mind',
    refund: 34.99,
    status: 'approved',
    resolution: 'refund',
  },
  {
    id: 'R2083',
    orderId: '10675',
    customer: { name: 'Noah Williams', email: 'noah.williams@example.com' },
    date: 'Jan 20, 2025',
    time: '5:05 PM',
    items: 3,
    reason: 'defective',
    refund: 129.98,
    status: 'in_transit',
    resolution: 'store_credit',
  },
  {
    id: 'R2082',
    orderId: '10674',
    customer: { name: 'Ava Brown', email: 'ava.brown@example.com' },
    date: 'Jan 19, 2025',
    time: '11:22 AM',
    items: 1,
    reason: 'wrong_item_sent',
    refund: 59.99,
    status: 'refunded',
    resolution: 'refund',
  },
  {
    id: 'R2081',
    orderId: '10672',
    customer: { name: 'James Miller', email: 'james.miller@example.com' },
    date: 'Jan 18, 2025',
    time: '6:41 PM',
    items: 2,
    reason: 'late_delivery',
    refund: 24.99,
    status: 'rejected',
    resolution: 'none',
  },
  {
    id: 'R2080',
    orderId: '10670',
    customer: { name: 'Sophia Davis', email: 'sophia.davis@example.com' },
    date: 'Jan 18, 2025',
    time: '5:09 PM',
    items: 1,
    reason: 'quality_issue',
    refund: 39.99,
    status: 'completed',
    resolution: 'store_credit',
  },
  {
    id: 'R2079',
    orderId: '10668',
    customer: { name: 'William Wilson', email: 'william.wilson@example.com' },
    date: 'Jan 17, 2025',
    time: '1:14 PM',
    items: 2,
    reason: 'damaged_item',
    refund: 79.98,
    status: 'approved',
    resolution: 'exchange',
  },
];

const initialState = {
  status: 'succeeded',
  error: '',
  filters: {
    query: '',
    dateRange: 'May 22 - Jun 21, 2025',
    status: 'all',
    reason: 'all',
    resolution: 'all',
  },
  pagination: {
    page: 1,
    pageSize: 8,
    total: 86,
  },
  returns: returnRows,
};

const returnsSlice = createSlice({
  name: 'returns',
  initialState,
  reducers: {
    setReturnFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearReturnFilters(state) {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setReturnsPayload(state, action) {
      const payload = action.payload || {};
      state.returns = payload.returns || state.returns;
      state.pagination = { ...state.pagination, ...(payload.pagination || {}) };
      state.status = 'succeeded';
      state.error = '';
    },
  },
});

export const { setReturnFilters, clearReturnFilters, setReturnsPayload } = returnsSlice.actions;
export default returnsSlice.reducer;
