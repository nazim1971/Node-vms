import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';
export const Feature = (moduleName: string) => SetMetadata(FEATURE_KEY, moduleName);
