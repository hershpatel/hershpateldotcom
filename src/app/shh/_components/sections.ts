import { DeleteSection } from "./sections/DeleteSection";
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
    id: 'delete',
    label: 'delete images',
    Component: DeleteSection
  }
];
