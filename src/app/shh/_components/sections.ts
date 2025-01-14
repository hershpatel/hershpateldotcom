import { DeleteSection } from "./sections/DeleteSection";
import { OptimizeSection } from "./sections/OptimizeSection";
import { UploadSection } from "./sections/UploadSection";

export type SectionId = string;

export interface Section {
  id: SectionId;
  label: string;
  Component: () => JSX.Element;
}

export const sections: Section[] = [
  {
    id: 'upload',
    label: 'upload images',
    Component: UploadSection
  },
  {
    id: 'optimize',
    label: 'optimize images',
    Component: OptimizeSection
  },
  {
    id: 'delete',
    label: 'delete images',
    Component: DeleteSection
  }
];
