import api from './api';
import type { UnsignedXdrResponse } from './loans.service';

export interface SubmitVouchDto {
  mentorWallet: string;
  learnerWallet: string;
  amount: number;
}

export const vouchService = {
  async submitVouch(dto: SubmitVouchDto): Promise<UnsignedXdrResponse> {
    const res = await api.post<UnsignedXdrResponse>('/vouches/submit', dto);
    return res.data;
  },
};
