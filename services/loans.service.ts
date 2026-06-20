import api from './api';
import { addBreadcrumb, captureServiceError } from './sentry';
import type { Installment, Loan } from '../types/loan.types';

export interface AvailableCredit {
  available: number;
  limit: number;
  used: number;
}

export interface CreateLoanDto {
  vendorId: string;
  totalAmount: number;
  guaranteeAmount: number;
  schedule: Installment[];
}

export interface UnsignedXdrResponse {
  unsignedXdr: string;
}

export const loansService = {
  async getMyLoans(): Promise<Loan[]> {
    addBreadcrumb('loans.service', 'Fetching user loans');
    try {
      const res = await api.get<{ data: Loan[] }>('/loans/my-loans');
      addBreadcrumb('loans.service', 'Loans fetched', { count: res.data.data.length });
      return res.data.data;
    } catch (error) {
      captureServiceError('loans', 'getMyLoans', error);
      throw error;
    }
  },

  async getLoanById(id: string): Promise<Loan> {
    addBreadcrumb('loans.service', 'Fetching loan by ID', { loanId: id });
    try {
      const res = await api.get<Loan>(`/loans/${id}`);
      return res.data;
    } catch (error) {
      captureServiceError('loans', 'getLoanById', error);
      throw error;
    }
  },

  async getAvailableCredit(): Promise<AvailableCredit> {
    addBreadcrumb('loans.service', 'Fetching available credit');
    try {
      const res = await api.get<AvailableCredit>('/loans/available-credit');
      return res.data;
    } catch (error) {
      captureServiceError('loans', 'getAvailableCredit', error);
      throw error;
    }
  },

  async createLoan(dto: CreateLoanDto): Promise<UnsignedXdrResponse> {
    addBreadcrumb('loans.service', 'Creating loan', {
      vendorId: dto.vendorId,
      totalAmount: dto.totalAmount,
    });
    try {
      const res = await api.post<UnsignedXdrResponse>('/loans/create', dto);
      addBreadcrumb('loans.service', 'Loan created');
      return res.data;
    } catch (error) {
      captureServiceError('loans', 'createLoan', error);
      throw error;
    }
  },

  async repayInstallment(
    loanId: string,
    installmentIndex: number,
    amount: number,
  ): Promise<UnsignedXdrResponse> {
    addBreadcrumb('loans.service', 'Repaying installment', {
      loanId,
      installmentIndex,
      amount,
    });
    try {
      const res = await api.post<UnsignedXdrResponse>(`/loans/${loanId}/repay-installment`, {
        installmentIndex,
        amount,
      });
      addBreadcrumb('loans.service', 'Installment repaid');
      return res.data;
    } catch (error) {
      captureServiceError('loans', 'repayInstallment', error);
      throw error;
    }
  },
};
