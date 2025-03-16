import { Constructable } from 'typedi';

type ContainerHelperInjectionVersion = 'singleton' | 'scoped' | 'transient';

type ContainerHelperDictionaryItem = {
  value: Constructable<unknown>;
  injectionVersion: ContainerHelperInjectionVersion;
};

export type ContainerHelperDictionary = {
  [index: string]: ContainerHelperDictionaryItem;
};
