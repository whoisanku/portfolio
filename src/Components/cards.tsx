import {
  AnyPublication,
  PrimaryPublication,
  PublicationMetadata,
} from "@lens-protocol/react-web";
import { ReactNode } from "react";

function MetadataSwitch({ metadata }: { metadata: PublicationMetadata }) {
  console.log("metadata" + metadata);
  switch (metadata.__typename) {
    case "ArticleMetadataV3":
    case "TextOnlyMetadataV3":
      return <p className="text-white mb-4">{metadata.content}</p>;

    case "ImageMetadataV3":
      return (
        <>
          {metadata.content && (
            <p className="text-white mb-4">{metadata.content}</p>
          )}
          <img
            src={metadata.asset?.image?.medium?.uri}
            alt={metadata.asset?.altTag ?? undefined}
            className="w-full h-auto rounded-lg mb-4"
          />
        </>
      );

    default:
      return (
        <p className="text-white">
          {metadata.__typename} not supported in this example
        </p>
      );
  }
}

function PublicationBody({ publication }: { publication: PrimaryPublication }) {
  return (
    <div className="mb-4">
      <MetadataSwitch metadata={publication.metadata} />
    </div>
  );
}

function PublicationSwitch({ publication }: { publication: AnyPublication }) {
  switch (publication.__typename) {
    case "Post":
    case "Comment":
    case "Quote":
      return <PublicationBody publication={publication} />;
    default:
      return null;
  }
}

type PublicationCardProps = {
  publication: AnyPublication;
  children?: ReactNode;
};

export function PublicationCard({
  publication,
  children,
}: PublicationCardProps) {
  return (
    <article className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="text-gray-400 text-sm mb-2">
        {/* {publication.__typename} by {publication.by.?handle} */}
      </div>
      <PublicationSwitch publication={publication} />
      {children}
    </article>
  );
}
