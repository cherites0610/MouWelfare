export class WelfarePaginatedResponseDTO<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export class WelfareResponseDTO {
  id: string;
  title: string;
  detail: string;
  summary: string;
  link: string;
  forward: string;
  publicationDate: string;
  status: number;
  location: string;
  categories: string[];
  lightStatus?: number;
  familyMember?: welfareFamilyMember[];
  isAbnormal: boolean;
}

export class welfareFamilyMember {
  avatarUrl: string;
  lightStatus: number;
  name: string;
}
