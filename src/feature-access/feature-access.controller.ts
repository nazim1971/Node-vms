import { Controller } from '@nestjs/common';
import { FeatureAccessService } from './feature-access.service';

@Controller('feature-access')
export class FeatureAccessController {
  constructor(private readonly featureAccessService: FeatureAccessService) {}
}
