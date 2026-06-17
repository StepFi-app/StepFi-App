import api from './api';
import type { UnsignedXdrResponse } from './loans.service';

export interface DepositDto {
  amount: number;
}

export const liquidityService = {
  async deposit(dto: DepositDto): Promise<UnsignedXdrResponse> {
    const res = await api.post<UnsignedXdrResponse>('/liquidity/deposit', dto);
    return res.data;
  },
};
